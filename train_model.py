"""
CyberGuard — Image Cyberbullying Detection Model Trainer
=========================================================
Uses MobileNetV2 transfer learning to classify images as:
  - cyberbullying (hate symbols, threatening screenshots, harmful memes, etc.)
  - safe (normal, harmless images)

Directory structure required:
  training_data/
    cyberbullying/   ← Put harmful images here
    safe/            ← Put normal/harmless images here

Usage:
  pip install tensorflow tensorflowjs Pillow matplotlib
  python train_model.py

Output:
  custom_model/         ← TensorFlow.js model for browser use
  saved_model/          ← Full TensorFlow model for backup
  training_report.png   ← Accuracy & loss charts
"""

import os
import sys
import json
import shutil
import numpy as np

# Fix Windows encoding (cp1252 can't print emojis)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ─── Check dependencies ───
try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
    from tensorflow.keras.models import Model
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
except ImportError:
    print("❌ TensorFlow not installed. Run: pip install tensorflow")
    sys.exit(1)

# tensorflowjs is used via CLI converter (Python import breaks on Windows)
import subprocess
HAS_TFJS = shutil.which('tensorflowjs_converter') is not None
if not HAS_TFJS:
    print("Note: tensorflowjs_converter CLI not found. Model will be saved but convert manually.")

try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("⚠ matplotlib not found — skipping training charts. Install with: pip install matplotlib")


# ═══════════════════════════════════════════════════════
#  CONFIGURATION — Adjust these settings as needed
# ═══════════════════════════════════════════════════════

# Paths
TRAINING_DATA_DIR = os.path.join(os.path.dirname(__file__), 'training_data')
OUTPUT_TFJS_DIR   = os.path.join(os.path.dirname(__file__), 'custom_model')
OUTPUT_SAVED_DIR  = os.path.join(os.path.dirname(__file__), 'saved_model')
REPORT_PATH       = os.path.join(os.path.dirname(__file__), 'training_report.png')

# Model hyperparameters
IMG_SIZE       = 224       # MobileNetV2 expects 224×224
BATCH_SIZE     = 16        # Smaller batch for small datasets
EPOCHS         = 30        # Max epochs (early stopping will cut short if needed)
LEARNING_RATE  = 0.0005    # Learning rate for Adam optimizer
FINE_TUNE_AT   = 100       # Unfreeze layers from this point onward for fine-tuning
VALIDATION_SPLIT = 0.2     # 20% of data for validation


def check_training_data():
    """Validate that training data directories exist and have images."""

    if not os.path.isdir(TRAINING_DATA_DIR):
        print(f"\n❌ Training data directory not found: {TRAINING_DATA_DIR}")
        print(f"\n📁 Creating directory structure for you...\n")
        os.makedirs(os.path.join(TRAINING_DATA_DIR, 'cyberbullying'), exist_ok=True)
        os.makedirs(os.path.join(TRAINING_DATA_DIR, 'safe'), exist_ok=True)
        print(f"   Created: {TRAINING_DATA_DIR}/cyberbullying/")
        print(f"   Created: {TRAINING_DATA_DIR}/safe/")
        print(f"\n📌 Next steps:")
        print(f"   1. Add cyberbullying images to: training_data/cyberbullying/")
        print(f"   2. Add safe/normal images to:   training_data/safe/")
        print(f"   3. Run this script again: python train_model.py")
        print(f"\n💡 Tip: You need at least 30-50 images per category for decent results.")
        print(f"   Download from Kaggle → search 'hateful memes' or 'cyberbullying images'\n")
        return False

    cyber_dir = os.path.join(TRAINING_DATA_DIR, 'cyberbullying')
    safe_dir  = os.path.join(TRAINING_DATA_DIR, 'safe')

    if not os.path.isdir(cyber_dir) or not os.path.isdir(safe_dir):
        os.makedirs(cyber_dir, exist_ok=True)
        os.makedirs(safe_dir, exist_ok=True)
        print(f"\n❌ Missing subdirectories. Created them for you:")
        print(f"   → {cyber_dir}")
        print(f"   → {safe_dir}")
        print(f"\n   Add images and run again.\n")
        return False

    VALID_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'}

    cyber_images = [f for f in os.listdir(cyber_dir)
                    if os.path.splitext(f)[1].lower() in VALID_EXTENSIONS]
    safe_images  = [f for f in os.listdir(safe_dir)
                    if os.path.splitext(f)[1].lower() in VALID_EXTENSIONS]

    print(f"\n📊 Training Data Summary:")
    print(f"   Cyberbullying images: {len(cyber_images)}")
    print(f"   Safe images:          {len(safe_images)}")
    print(f"   Total:                {len(cyber_images) + len(safe_images)}")

    if len(cyber_images) < 5 or len(safe_images) < 5:
        print(f"\n❌ Not enough images! Need at least 5 per category (30+ recommended).")
        print(f"   Add more images and run again.\n")
        return False

    if len(cyber_images) < 30 or len(safe_images) < 30:
        print(f"\n⚠ Warning: Less than 30 images per category — model accuracy may be low.")
        print(f"   Consider adding more images for better results.\n")

    return True


def create_data_generators():
    """Create training and validation data generators with augmentation."""

    # Training data generator with augmentation
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.15,
        zoom_range=0.2,
        horizontal_flip=True,
        brightness_range=[0.8, 1.2],
        fill_mode='nearest',
        validation_split=VALIDATION_SPLIT
    )

    # Validation data — only rescale, no augmentation
    val_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=VALIDATION_SPLIT
    )

    print(f"\n📷 Loading images ({IMG_SIZE}×{IMG_SIZE})...\n")

    train_generator = train_datagen.flow_from_directory(
        TRAINING_DATA_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='training',
        shuffle=True,
        seed=42
    )

    val_generator = val_datagen.flow_from_directory(
        TRAINING_DATA_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation',
        shuffle=False,
        seed=42
    )

    # Print class mapping
    class_indices = train_generator.class_indices
    print(f"\n🏷️  Class mapping: {class_indices}")
    print(f"   0 = {list(class_indices.keys())[0]}")
    print(f"   1 = {list(class_indices.keys())[1]}")

    # Save class mapping for the browser to use
    class_map_path = os.path.join(os.path.dirname(__file__), 'custom_model')
    os.makedirs(class_map_path, exist_ok=True)
    with open(os.path.join(class_map_path, 'class_labels.json'), 'w') as f:
        json.dump({str(v): k for k, v in class_indices.items()}, f, indent=2)

    return train_generator, val_generator, class_indices


def build_model():
    """Build transfer learning model using MobileNetV2."""

    print(f"\n🧠 Building model with MobileNetV2 backbone...\n")

    # Load MobileNetV2 pre-trained on ImageNet (without top classification layers)
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3)
    )

    # Freeze the base model initially
    base_model.trainable = False

    # Build custom classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    x = BatchNormalization()(x)
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.3)(x)
    output = Dense(1, activation='sigmoid')(x)  # Binary: cyberbullying vs safe

    model = Model(inputs=base_model.input, outputs=output)

    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    total_params = model.count_params()
    trainable_params = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)

    print(f"   Total parameters:     {total_params:,}")
    print(f"   Trainable parameters: {trainable_params:,}")
    print(f"   Base model layers:    {len(base_model.layers)}")

    return model, base_model


def fine_tune_model(model, base_model):
    """Unfreeze some base model layers for fine-tuning."""

    print(f"\n🔧 Fine-tuning: Unfreezing layers from {FINE_TUNE_AT} onward...\n")

    base_model.trainable = True

    # Freeze layers before FINE_TUNE_AT
    for layer in base_model.layers[:FINE_TUNE_AT]:
        layer.trainable = False

    # Recompile with a lower learning rate for fine-tuning
    model.compile(
        optimizer=Adam(learning_rate=LEARNING_RATE / 10),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    trainable_params = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    print(f"   Trainable parameters after fine-tuning: {trainable_params:,}")

    return model


def save_training_report(history_phase1, history_phase2):
    """Generate and save training accuracy/loss charts."""

    if not HAS_MATPLOTLIB:
        return

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Combine histories
    acc = history_phase1.history['accuracy'] + history_phase2.history['accuracy']
    val_acc = history_phase1.history['val_accuracy'] + history_phase2.history['val_accuracy']
    loss = history_phase1.history['loss'] + history_phase2.history['loss']
    val_loss = history_phase1.history['val_loss'] + history_phase2.history['val_loss']

    epochs_range = range(1, len(acc) + 1)
    phase1_end = len(history_phase1.history['accuracy'])

    # Accuracy plot
    axes[0].plot(epochs_range, acc, 'b-', label='Training Accuracy', linewidth=2)
    axes[0].plot(epochs_range, val_acc, 'r-', label='Validation Accuracy', linewidth=2)
    axes[0].axvline(x=phase1_end, color='gray', linestyle='--', alpha=0.5, label='Fine-tuning starts')
    axes[0].set_title('Model Accuracy', fontsize=14, fontweight='bold')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Accuracy')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Loss plot
    axes[1].plot(epochs_range, loss, 'b-', label='Training Loss', linewidth=2)
    axes[1].plot(epochs_range, val_loss, 'r-', label='Validation Loss', linewidth=2)
    axes[1].axvline(x=phase1_end, color='gray', linestyle='--', alpha=0.5, label='Fine-tuning starts')
    axes[1].set_title('Model Loss', fontsize=14, fontweight='bold')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Loss')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.suptitle('CyberGuard Image Classifier Training Report', fontsize=16, fontweight='bold')
    plt.tight_layout()
    plt.savefig(REPORT_PATH, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"   📈 Training report saved: {REPORT_PATH}")


def train():
    """Main training pipeline."""

    print("\n" + "═" * 60)
    print("  CyberGuard — Image Cyberbullying Model Trainer")
    print("═" * 60)

    # Step 1: Check training data
    if not check_training_data():
        return

    # Step 2: Create data generators
    train_gen, val_gen, class_indices = create_data_generators()

    # Step 3: Build model
    model, base_model = build_model()

    # Step 4: Callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        ModelCheckpoint(
            os.path.join(OUTPUT_SAVED_DIR, 'best_model.keras'),
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]

    os.makedirs(OUTPUT_SAVED_DIR, exist_ok=True)

    # Step 5: Phase 1 — Train classification head only
    print(f"\n{'─' * 60}")
    print(f"  Phase 1: Training classification head ({EPOCHS // 2} epochs)")
    print(f"{'─' * 60}\n")

    history1 = model.fit(
        train_gen,
        epochs=EPOCHS // 2,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1
    )

    # Step 6: Phase 2 — Fine-tune with some base layers unfrozen
    model = fine_tune_model(model, base_model)

    print(f"\n{'─' * 60}")
    print(f"  Phase 2: Fine-tuning ({EPOCHS // 2} epochs)")
    print(f"{'─' * 60}\n")

    history2 = model.fit(
        train_gen,
        epochs=EPOCHS // 2,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1
    )

    # Step 7: Evaluate
    print(f"\n{'─' * 60}")
    print(f"  Final Evaluation")
    print(f"{'─' * 60}\n")

    val_loss, val_acc = model.evaluate(val_gen, verbose=0)
    print(f"   ✅ Validation Accuracy: {val_acc * 100:.1f}%")
    print(f"   📉 Validation Loss:     {val_loss:.4f}")

    # Step 8: Save training report
    save_training_report(history1, history2)

    # Step 9: Save full TensorFlow model
    model.save(os.path.join(OUTPUT_SAVED_DIR, 'cyberbullying_model.keras'))
    print(f"   💾 TensorFlow model saved: {OUTPUT_SAVED_DIR}/")

    # Step 10: Export to TensorFlow.js format
    saved_keras_path = os.path.join(OUTPUT_SAVED_DIR, 'cyberbullying_model.keras')

    # Preserve class_labels.json
    labels_path = os.path.join(OUTPUT_TFJS_DIR, 'class_labels.json')
    labels_backup = None
    if os.path.exists(labels_path):
        with open(labels_path, 'r') as f:
            labels_backup = f.read()

    if HAS_TFJS:
        print(f"\nConverting to TensorFlow.js format...\n")
        if os.path.exists(OUTPUT_TFJS_DIR):
            shutil.rmtree(OUTPUT_TFJS_DIR)
        os.makedirs(OUTPUT_TFJS_DIR, exist_ok=True)

        result = subprocess.run([
            'tensorflowjs_converter',
            '--input_format=keras',
            saved_keras_path,
            OUTPUT_TFJS_DIR
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print(f"   TensorFlow.js model saved: {OUTPUT_TFJS_DIR}/")
        else:
            print(f"   WARNING: TF.js conversion failed: {result.stderr[:200]}")
            print(f"   Convert manually: tensorflowjs_converter --input_format=keras {saved_keras_path} {OUTPUT_TFJS_DIR}")
    else:
        print(f"\n   Skipping TF.js conversion (converter not found).")
        print(f"   Convert manually: tensorflowjs_converter --input_format=keras {saved_keras_path} {OUTPUT_TFJS_DIR}")

    # Restore class_labels.json
    if labels_backup:
        os.makedirs(OUTPUT_TFJS_DIR, exist_ok=True)
        with open(labels_path, 'w') as f:
            f.write(labels_backup)

    # Step 11: Summary
    print(f"\n{'=' * 60}")
    print(f"  TRAINING COMPLETE!")
    print(f"{'=' * 60}")
    print(f"   Accuracy:      {val_acc * 100:.1f}%")
    print(f"   Loss:          {val_loss:.4f}")
    print(f"   Saved model:   {OUTPUT_SAVED_DIR}/")
    if os.path.exists(os.path.join(OUTPUT_TFJS_DIR, 'model.json')):
        model_files = os.listdir(OUTPUT_TFJS_DIR)
        total_size = sum(os.path.getsize(os.path.join(OUTPUT_TFJS_DIR, f)) for f in model_files)
        print(f"   TF.js model:   {OUTPUT_TFJS_DIR}/ ({total_size / (1024*1024):.1f} MB)")
    print(f"\n   Next step: Start the server with 'node server.js'")
    print(f"   The model will be automatically loaded in the browser!\n")


if __name__ == '__main__':
    train()
