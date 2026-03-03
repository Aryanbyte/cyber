"""
Sort images from the Facebook Hateful Memes dataset into training folders.
Reads labels from train.jsonl, dev.jsonl, test.jsonl and copies images
into training_data/cyberbullying/ and training_data/safe/.
"""
import json
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # DSA and algorithm folder
IMG_DIR = os.path.join(BASE_DIR, 'img')
TRAIN_DIR = os.path.join(os.path.dirname(__file__), 'training_data')
CYBER_DIR = os.path.join(TRAIN_DIR, 'cyberbullying')
SAFE_DIR = os.path.join(TRAIN_DIR, 'safe')

# Create directories
os.makedirs(CYBER_DIR, exist_ok=True)
os.makedirs(SAFE_DIR, exist_ok=True)

# Read all label files
labels = {}
for fname in ['train.jsonl', 'dev.jsonl', 'test.jsonl']:
    fpath = os.path.join(BASE_DIR, fname)
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                img_id = str(entry['id'])
                label = entry.get('label', 0)
                labels[img_id] = label
        print(f"Read {fname}: found entries")

print(f"\nTotal labels: {len(labels)}")
print(f"  Hateful (cyberbullying): {sum(1 for v in labels.values() if v == 1)}")
print(f"  Safe:                    {sum(1 for v in labels.values() if v == 0)}")

# Copy images to the correct folders
copied_cyber = 0
copied_safe = 0
skipped = 0

for img_file in os.listdir(IMG_DIR):
    if not img_file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')):
        continue

    img_id = os.path.splitext(img_file)[0]

    if img_id in labels:
        src = os.path.join(IMG_DIR, img_file)
        if labels[img_id] == 1:
            dst = os.path.join(CYBER_DIR, img_file)
            copied_cyber += 1
        else:
            dst = os.path.join(SAFE_DIR, img_file)
            copied_safe += 1
        shutil.copy2(src, dst)
    else:
        skipped += 1

print(f"\nDone!")
print(f"  Copied to cyberbullying/: {copied_cyber}")
print(f"  Copied to safe/:          {copied_safe}")
print(f"  Skipped (no label):       {skipped}")
print(f"\nReady to train! Run: python train_model.py")
