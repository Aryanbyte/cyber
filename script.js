// CyberGuard – Detection Engine & App Logic
// Trained on 47,986 tweet dataset + 100 Indian language dataset
// Enhanced with OpenAI Moderation API + GPT-4o-mini Vision

(function () {
    'use strict';

    /* ---------- OpenAI API KEY (loaded from server env) ---------- */
    var OPENAI_API_KEY = '';

    /* ---------- keyword dictionaries ----------
       Built from frequency analysis of ~48K labeled tweets + 100 Indian language samples.
       Categories: religion, age, gender, ethnicity, other_cyberbullying + Hindi/Hinglish abuse.
       Remapped to detection-friendly labels for the UI.
    ---------- */
    var DICT = {
        harassment: {
            words: [
                'bullied', 'bully', 'bullies', 'bullying',
                'mean girl', 'mean girls', 'popular kids',
                'stupid', 'idiot', 'loser', 'ugly', 'dumb', 'pathetic', 'worthless',
                'disgusting', 'freak', 'creep', 'weirdo', 'useless',
                'moron', 'fool', 'clown', 'trash', 'lame', 'annoying', 'boring',
                'retard', 'retarded', 'imbecile', 'dimwit', 'halfwit', 'nitwit',
                'brainless', 'clueless', 'dense', 'ignorant', 'incompetent',
                'cringe', 'hopeless', 'miserable', 'pitiful',
                'ridiculous', 'laughable', 'failure', 'reject', 'outcast',
                'fat', 'skinny', 'obese', 'fatso', 'fatty',
                'pig', 'cow', 'whale', 'hippo', 'blob',
                'overweight', 'anorexic', 'chubby', 'pudgy',
                'hideous', 'grotesque', 'repulsive', 'revolting',
                'gross', 'fugly', 'butt ugly', 'ugly face',
                'shut up', 'go away', 'no one likes you', 'nobody cares',
                'you suck', 'get lost', 'waste of space',
                'go cry', 'cry baby', 'grow up', 'get a life', 'so desperate',
                'attention seeker', 'no friends',
                'nobody wants you', 'you are a burden',
                'you ruin everything', 'everything is your fault',
                'you are embarrassing',
                'noob', 'scrub', 'bot', 'npc', 'simp', 'incel', 'karen',
                'boomer', 'snowflake', 'triggered', 'salty', 'toxic',
                'mid', 'basic', 'normie', 'poser', 'wannabe',
                'cripple', 'spaz', 'psycho', 'lunatic', 'maniac',
                'nutcase', 'deranged', 'unstable', 'crazy',
                'dork', 'nerd', 'geek', 'wimp', 'coward', 'weakling',
                'loser', 'hater', 'troll', 'stalker', 'creeper',
                'lowlife', 'deadbeat', 'bum', 'slob', 'slacker',
                'pagal', 'pagalpan', 'gadha', 'gadhe', 'buddhu', 'bewakoof',
                'bevakoof', 'nalayak', 'nikamma', 'nikammi', 'nikaame',
                'bekaar', 'bekar', 'bakwas', 'bakwaas', 'ghatiya',
                'wahiyat', 'tuchha', 'tuchhi', 'faaltu', 'faltu',
                'chamcha', 'chamchi', 'chapri', 'chappal chor',
                'mota', 'moti', 'kaala', 'kaali', 'ganda', 'gandi',
                'besharam', 'besharmi', 'badtameez', 'badtameezi',
                'naalayak', 'kameena', 'kameeni', 'kamina', 'kamini',
                'gutter', 'keede', 'keeda', 'keedi',
                'ullu', 'ullu ka pattha', 'ullu ki pathhi',
                'chutiya', 'chutiye', 'chu', 'mc', 'bc',
                'madarchod', 'behenchod', 'bhosdike', 'bhosdi',
                'gadhey', 'haramkhor', 'harami', 'haraamkhor',
                'kutte', 'kutti', 'kutta', 'kutiya',
                'suar', 'suwar', 'suar ki aulad',
                'gandgi', 'Gand', 'gandha', 'shakal dekh',
                'teri shakal', 'shakal dekh ke darr lagta',
                'tujhe koi pasand nahi karta', 'koi tujhe nahi sunega',
                'tujhe koi dekhta bhi nahi', 'teri koi value nahi',
                'teri aukaat nahi', 'teri aukaat kya hai',
                'bilkul bekaar ho', 'akal nahi hai',
                'muh se kuch acha nahi nikalta',
                'chup kar', 'chup ho ja', 'chup reh',
                'band kar', 'band karo'
            ],
            w: 2
        },
        threat: {
            words: [
                'kill', 'die', 'hurt', 'punch', 'beat', 'attack', 'destroy',
                'murder', 'stab', 'shoot', 'burn', 'choke', 'strangle', 'slap',
                'smash', 'crush', 'slam', 'thrash', 'strike', 'whack', 'clobber',
                'pummel', 'maul', 'batter', 'assault', 'ambush',
                'stomp', 'kick', 'drown', 'hang', 'torture', 'maim',
                'i will find you', 'watch your back', 'you are dead',
                'i will hurt you', 'gonna beat you', 'will destroy you',
                'better run', 'you will pay', 'your days are numbered',
                'i know where you live', 'i will come for you',
                'sleep with one eye open',
                'i will end you', 'you are finished', 'say your prayers',
                'this is your last warning', 'count your days',
                'i will make you suffer', 'you will regret this',
                'wait till i see you', 'see what happens',
                'you are going to get it', 'meet me outside',
                'pull up', 'catch you slipping',
                'better watch yourself',
                'you are not safe',
                'nowhere to hide', 'mark my words', 'this isnt over',
                'coming for you', 'gonna get you',
                'will get what you deserve',
                'i found your address', 'i know your school',
                'i know where you work', 'posting your info',
                'sharing your photos', 'leaking your pictures',
                'exposing you', 'spreading your secrets',
                'doxxed', 'doxxing', 'swatting', 'swatted',
                'dekh lunga', 'main dekh lunga', 'tujhe dekh lunga',
                'teri family ko dekh lunga', 'teri family ko main dekh lunga',
                'thok dunga', 'thok denge', 'maar dunga', 'maar denge',
                'peet dunga', 'peet denge', 'dhunai', 'pitai',
                'sabak sikhana padega', 'sabak sikhaenge', 'sabak sikhaunga',
                'chal nikal', 'nikal yahan se', 'hatt yahan se',
                'yahan teri aukaat nahi', 'tujhe toh main',
                'jaan se maar dunga', 'jaan le lunga',
                'khatam kar dunga', 'tera khatma', 'teri band bajegi',
                'band baja dunga', 'haddi tod dunga', 'haath tod dunga',
                'tang tod dunga', 'muh tod dunga', 'thappad marunga',
                'dekh lena', 'baad mein dekh lena', 'aata hai toh aa',
                'bahar aa', 'bahar mil', 'teri khair nahi',
                'tujhe chhodunga nahi', 'nahi chhodunga', 'pakad lunga'
            ],
            w: 5
        },
        hate_speech: {
            words: [
                'nigger', 'niggers', 'nigga', 'niggas', 'negro', 'negros',
                'cracker', 'spic', 'wetback', 'chink', 'gook', 'kike',
                'sand nigger', 'towelhead', 'camel jockey',
                'beaner', 'gringo', 'honky', 'redneck',
                'go back to your country', 'do not belong here',
                'your kind', 'people like you', 'you people', 'they are all',
                'go back where you came from', 'not welcome here',
                'stick to your own', 'stay with your own kind',
                'dirty immigrant', 'illegal alien',
                'go home', 'does not belong',
                'ruining this country', 'taking our jobs',
                'inferior', 'subhuman', 'savage', 'primitive', 'vermin',
                'plague', 'parasite', 'cockroach', 'filth', 'scum',
                'mongrel', 'mutt', 'lowlife', 'bottom feeder',
                'degenerate', 'deviant', 'abomination', 'abnormal',
                'unnatural', 'defective',
                'islamophobia', 'islamophobic',
                'christophobia', 'antisemitic', 'antisemitism',
                'infidel', 'heathen', 'godless', 'blasphemer',
                'jihadist', 'terrorist', 'extremist', 'radical',
                'sissy', 'pansy', 'fairy', 'butch', 'dyke',
                'tranny', 'shemale', 'not a real man',
                'not a real woman', 'pick a gender', 'only two genders',
                'feminazi', 'homophobic',
                'master race', 'pure blood', 'race traitor',
                'white power', 'ethnic cleansing',
                'white supremacy', 'white supremacist',
                'genocide', 'racial purity',
                'colored', 'blacks', 'whites',
                'racism', 'racist', 'racists',
                'sexist', 'sexism', 'misogynist', 'misogyny',
                'bigot', 'bigotry', 'prejudice', 'discrimination',
                'desh ke dushman', 'desh badnaam',
                'tum jaise logon ki wajah se', 'tum jaise log',
                'tum logon ko', 'tum log toh',
                'jail mein hona chahiye', 'bharosa nahi kar sakte',
                'tumhari jaat', 'jaatiwad', 'casteism',
                'neech', 'neech jaat', 'chhota aadmi',
                'anpadh', 'gawar', 'gaon ka',
                'tum log hi problem ho', 'tum log hi problem hain',
                'nafrat', 'nafrat hai', 'logon se nafrat',
                'anti national', 'anti-national', 'deshdrohi',
                'gaddaar', 'gaddar', 'deshdroh',
                'pakistani', 'terrorist', 'aatankwadi', 'jihadi',
                'yeh log', 'inke type ke log', 'in logon ki',
                'madrasi', 'bhaiyya', 'bihari', 'chinki',
                'kallu', 'kaalu', 'kalia'
            ],
            w: 4
        },
        profanity: {
            words: [
                'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks', 'fuckin',
                'shit', 'shitty', 'bullshit', 'shits',
                'ass', 'asses', 'asshole', 'assholes',
                'bitch', 'bitches', 'bitchy',
                'damn', 'damned', 'dammit',
                'hell', 'crap', 'crappy',
                'dick', 'dicks', 'dickhead',
                'pussy', 'pussies',
                'cunt', 'cunts',
                'bastard', 'bastards',
                'whore', 'whores', 'slut', 'sluts', 'hoe', 'hoes',
                'piss', 'pissed', 'pissing',
                'suck', 'sucks', 'sucking',
                'screw you', 'stfu', 'gtfo', 'wtf', 'fml', 'smh', 'lmao',
                'wanker', 'tosser', 'bollocks', 'bugger',
                'prick', 'jerk', 'douche', 'douchebag',
                'jackass', 'dumbass', 'smartass',
                'scumbag', 'dirtbag', 'sleazeball',
                'piece of shit', 'piece of crap',
                'son of a bitch', 'motherfucker',
                'pos', 'sob',
                'saale', 'saali', 'sala', 'sali',
                'gaandu', 'gandu', 'tatti', 'hagne',
                'jhant', 'jhatu', 'lodu', 'loda', 'lauda', 'laude',
                'randi', 'randi ka', 'raand', 'raandi',
                'bhikhari', 'bhikarin', 'chor', 'dakait',
                'haraami', 'haraamzaade', 'haraamzaadi',
                'maderchod', 'bhenchod', 'behen ke', 'betichod', 'chod',
                'bhosdiwale', 'teri maa', 'teri maa ki',
                'maa behen', 'gaali'
            ],
            w: 1
        },
        toxicity: {
            words: [
                'kill yourself', 'kys', 'neck yourself', 'hang yourself',
                'drink bleach', 'end it', 'end yourself', 'off yourself',
                'do us all a favor', 'slit your wrists', 'jump off a bridge',
                'nobody would care if you died', 'better off dead',
                'hate you', 'despise', 'hope you suffer',
                'you deserve pain', 'everyone hates you',
                'no one would miss you', 'world is better without you',
                'should not exist', 'waste of air', 'oxygen thief',
                'you are a mistake', 'your parents regret you',
                'you should have never been born', 'nobody loves you',
                'die alone', 'rot in hell', 'burn in hell',
                'i wish you were dead', 'hope you get cancer',
                'hope you get hit by a car', 'hope bad things happen to you',
                'you deserve everything bad',
                'the world hates you', 'everyone thinks you are a joke',
                'you will always be alone', 'nobody will ever love you',
                'you poison everything',
                'your existence is a burden', 'you drag everyone down',
                'people pretend to like you', 'they talk behind your back',
                'everyone laughs at you', 'you are the problem',
                'you make everyone miserable', 'you are nothing',
                'you will never amount to anything', 'give up already',
                'just stop trying', 'you will never be good enough',
                'you are beyond help', 'there is no hope for you',
                'lost cause', 'broken beyond repair', 'damaged goods',
                'unfixable', 'irredeemable', 'beyond saving',
                'rape', 'raped', 'rapist',
                'sexual assault', 'molest', 'molested',
                'predator', 'groomer', 'pedophile', 'pedophilia',
                'go die', 'drop dead', 'get cancer', 'eat shit',
                'choke on it', 'gag on it', 'rot', 'perish',
                'suffer', 'you disgust me', 'makes me sick',
                'you make me want to vomit', 'repulsive human',
                'absolute trash', 'human garbage', 'human waste',
                'waste of skin', 'waste of oxygen', 'waste of life'
            ],
            w: 5
        }
    };

    var SAMPLES = [
        "You're such a loser, nobody even likes you. Go away.",
        "I'm going to find you and make you pay. Watch your back.",
        "Great meeting today everyone! I appreciate the teamwork.",
        "People like you don't belong here. Go back where you came from.",
        "You're so ugly and fat. What a waste of space.",
        "Thanks for your help, really appreciate it!",
        "You're such a noob, uninstall the game already you bot.",
        "Lol what a simp, desperate for attention much? So cringe.",
        "I know where you live, sleep with one eye open tonight.",
        "You should just kys, nobody would even notice you're gone.",
        "She's such a whale, have you seen her lately? Disgusting pig.",
        "Your kind are ruining this country. Go back where you came from.",
        "Shut your mouth you dimwit, who even asked for your opinion?",
        "You will never amount to anything. You are a failure. Give up.",
        "Hey, your presentation was really impressive. Keep it up!",
        "I disagree but I think we can find common ground here.",
        "You stupid fat cow, everyone laughs at you. You're a joke.",
        "That was an interesting perspective, thanks for sharing.",
        "All these feminazis need to shut up, bunch of ugly bitches.",
        "Why do these racist idiots keep saying stuff like that?",
        "Hope you get cancer and die alone you worthless piece of shit.",
        "I really enjoyed collaborating with you on this project!",
        "You're literally human garbage, the world is better without you.",
        "Can someone explain why rape jokes are even considered funny?",
        "Tu kitna mota ho gaya hai, gym jaa na bewakoof!",
        "Teri shakal dekh ke toh darr lagta hai, bilkul bekaar ho.",
        "Saale, tujhe toh main thok dunga, dekh lunga tujhe.",
        "Tum jaise logon ki wajah se desh badnaam hai, nikal yahan se.",
        "Chal nikal, yahan teri aukaat nahi, chup kar pagal.",
        "Bohot sundar pic, looking great bhai!",
        "Teri family ko main dekh lunga, teri khair nahi.",
        "Bhai, ye design toh ekdum mast hai, keep it up!"
    ];

    var ADVICE = {
        safe: "Looks all good! This text is clean and safe for any platform.",
        low: "There's some mildly negative language here. Might be fine depending on context, but consider softening the tone.",
        medium: "This has some concerning content that could count as harassment. Review it before letting it go live.",
        high: "This text contains clearly harmful language. It should probably be blocked or at least flagged for moderator review.",
        critical: "This contains serious threats or extreme toxicity. Recommend blocking this immediately and escalating if needed."
    };

    var SEV_EMOJI = { safe: '✅', low: 'ℹ️', medium: '⚠️', high: '🔶', critical: '🚨' };
    var SEV_TITLE = { safe: 'Safe', low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk', critical: 'Critical' };
    var SEV_SUB = { safe: 'No issues found', low: 'Minor concerns spotted', medium: 'Moderate harmful content', high: 'Significant harmful content', critical: 'Severe – action needed' };

    /* ---------- state ---------- */
    var history = [];
    try { history = JSON.parse(localStorage.getItem('cg_hist') || '[]'); } catch (e) { history = []; }

    var currentImageFile = null;
    var currentImageBase64 = null;

    var q = function (s) { return document.querySelector(s); };
    var qa = function (s) { return document.querySelectorAll(s); };

    /* ---------- navigation ---------- */
    function goTo(page) {
        qa('.view').forEach(function (v) { v.classList.remove('active'); });
        qa('.nav-item').forEach(function (n) { n.classList.remove('active'); });
        var el = q('#' + page);
        var link = q('.nav-item[data-page="' + page + '"]');
        if (el) el.classList.add('active');
        if (link) link.classList.add('active');
        q('#navItems').classList.remove('open');
        if (page === 'dashboard') refreshDash();
        if (page === 'history') renderHist();
    }

    /* ---------- keyword-based detection ---------- */
    function scan(text) {
        var low = text.toLowerCase().trim();
        if (!low) return null;

        var out = { score: 0, cats: {}, flagged: [], weight: 0 };

        for (var cat in DICT) {
            var d = DICT[cat];
            var hits = 0;
            for (var i = 0; i < d.words.length; i++) {
                var kw = d.words[i];
                var pat = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp('\\b' + pat + '\\b', 'gi');
                var m = low.match(re);
                if (m) {
                    hits += m.length;
                    out.weight += d.w * m.length;
                    for (var j = 0; j < m.length; j++) {
                        if (out.flagged.indexOf(m[j].toLowerCase()) === -1) {
                            out.flagged.push(m[j].toLowerCase());
                        }
                    }
                }
            }
            if (hits > 0) out.cats[cat] = hits;
        }

        var wc = text.split(/\s+/).filter(Boolean).length;
        var density = wc > 0 ? out.weight / wc : 0;
        out.score = Math.min(100, Math.round(density * 50 + out.weight * 3));

        if (out.score <= 10) out.sev = 'safe';
        else if (out.score <= 30) out.sev = 'low';
        else if (out.score <= 55) out.sev = 'medium';
        else if (out.score <= 79) out.sev = 'high';
        else out.sev = 'critical';

        return out;
    }

    /* ---------- OpenAI Moderation API (text) ---------- */
    async function moderateTextWithAPI(text) {
        try {
            var res = await fetch('/api/moderations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + OPENAI_API_KEY
                },
                body: JSON.stringify({ input: text })
            });
            if (!res.ok) throw new Error('API returned ' + res.status);
            var data = await res.json();
            return data.results[0];
        } catch (e) {
            console.warn('OpenAI Moderation API failed:', e.message);
            return null;
        }
    }

    /* Map OpenAI categories to our categories */
    var API_CAT_MAP = {
        'harassment': 'harassment',
        'harassment/threatening': 'threat',
        'hate': 'hate_speech',
        'hate/threatening': 'threat',
        'self-harm': 'toxicity',
        'self-harm/intent': 'toxicity',
        'self-harm/instructions': 'toxicity',
        'sexual': 'profanity',
        'sexual/minors': 'toxicity',
        'violence': 'threat',
        'violence/graphic': 'threat'
    };

    function mergeAPIResult(localResult, apiResult) {
        if (!apiResult) return localResult;

        var r = localResult || { score: 0, cats: {}, flagged: [], weight: 0, sev: 'safe' };
        var apiCats = apiResult.categories;
        var apiScores = apiResult.category_scores;
        var apiBoost = 0;

        for (var apiCat in apiCats) {
            if (apiCats[apiCat]) {
                var ourCat = API_CAT_MAP[apiCat] || 'toxicity';
                if (!r.cats[ourCat]) r.cats[ourCat] = 0;
                r.cats[ourCat] += 1;
                apiBoost += Math.round(apiScores[apiCat] * 40);
            }
        }

        // Also boost score from high-confidence API detections even if not flagged
        for (var sc in apiScores) {
            if (apiScores[sc] > 0.3 && !apiCats[sc]) {
                apiBoost += Math.round(apiScores[sc] * 10);
            }
        }

        r.score = Math.min(100, r.score + apiBoost);

        // Recalculate severity
        if (r.score <= 10) r.sev = 'safe';
        else if (r.score <= 30) r.sev = 'low';
        else if (r.score <= 55) r.sev = 'medium';
        else if (r.score <= 79) r.sev = 'high';
        else r.sev = 'critical';

        r.apiEnhanced = true;
        return r;
    }

    /* ---------- NSFWJS Browser-based Image Analysis ---------- */
    var nsfwModel = null;
    var modelLoading = false;
    var nsfwLoadFailed = false;

    async function loadNSFWModel() {
        if (nsfwModel) return nsfwModel;
        if (nsfwLoadFailed) return null;
        if (modelLoading) {
            while (modelLoading) {
                await new Promise(function (r) { setTimeout(r, 200); });
            }
            return nsfwModel;
        }
        modelLoading = true;
        try {
            // Load model from jsdelivr CDN (more reliable than default CloudFront)
            nsfwModel = await nsfwjs.load(
                'https://cdn.jsdelivr.net/npm/nsfwjs@4.1.0/dist/',
                { type: 'graph' }
            );
            console.log('NSFWJS model loaded successfully');
        } catch (e) {
            console.warn('NSFWJS model failed to load (OCR will still work):', e.message);
            nsfwLoadFailed = true;
            return null;
        } finally {
            modelLoading = false;
        }
        return nsfwModel;
    }

    /* ---------- Custom Cyberbullying Image Model (Transfer Learning) ---------- */
    var customModel = null;
    var customModelLoading = false;
    var customModelFailed = false;
    var customClassLabels = null;

    async function loadCustomModel() {
        if (customModel) return customModel;
        if (customModelFailed) return null;
        if (customModelLoading) {
            while (customModelLoading) {
                await new Promise(function (r) { setTimeout(r, 200); });
            }
            return customModel;
        }
        customModelLoading = true;
        try {
            // Load the TF.js model exported by train_model.py
            customModel = await tf.loadLayersModel('custom_model/model.json');
            console.log('✅ Custom cyberbullying model loaded successfully');

            // Load class labels
            try {
                var labelsRes = await fetch('custom_model/class_labels.json');
                if (labelsRes.ok) {
                    customClassLabels = await labelsRes.json();
                    console.log('   Class labels:', customClassLabels);
                }
            } catch (e) {
                console.warn('Class labels not found, using defaults');
                customClassLabels = { '0': 'cyberbullying', '1': 'safe' };
            }
        } catch (e) {
            console.warn('Custom model not available (train it first with train_model.py):', e.message);
            customModelFailed = true;
            return null;
        } finally {
            customModelLoading = false;
        }
        return customModel;
    }

    /* ---------- Gemini Vision API ---------- */
    async function analyzeImageWithGemini(base64Image, mimeType) {
        var base64Data = base64Image.split(',')[1] || base64Image;
        if (!mimeType) mimeType = "image/jpeg";

        var prompt = "Analyze this image for cyberbullying, hate speech, threats, harassment, or explicit NSFW content. Be extremely concise. If it is completely safe and normal, just reply 'The image is safe' and nothing else. If it contains harmful content, describe exactly what makes it harmful in one short sentence.";

        try {
            var res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }]
                })
            });
            if (!res.ok) throw new Error('Gemini API returned ' + res.status);
            var data = await res.json();

            if (data.error) {
                console.warn('Gemini API Error:', data.error.message);
                return { error: true, message: data.error.message };
            }

            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
                return data.candidates[0].content.parts[0].text;
            }
            return null;
        } catch (e) {
            console.warn('Gemini API failed:', e.message);
            return { error: true, message: e.message };
        }
    }

    async function analyzeImageWithCustomModel(imgElement) {
        var model = await loadCustomModel();
        if (!model) return null;

        // Preprocess: resize to 224×224 and normalize to [0, 1]
        var tensor = tf.browser.fromPixels(imgElement)
            .resizeBilinear([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims(0);

        // Run inference
        var prediction = model.predict(tensor);
        var score = (await prediction.data())[0]; // sigmoid output: 0-1

        // Clean up tensors
        tensor.dispose();
        prediction.dispose();

        // Determine which class is cyberbullying
        // The model output is sigmoid: value close to 1 = class "1", close to 0 = class "0"
        var labels = customClassLabels || { '0': 'cyberbullying', '1': 'safe' };
        var cyberClass = null;
        for (var key in labels) {
            if (labels[key] === 'cyberbullying') { cyberClass = parseInt(key); break; }
        }

        // Calculate cyberbullying probability
        var cyberProb;
        if (cyberClass === 1) {
            cyberProb = score; // sigmoid output = probability of class 1
        } else {
            cyberProb = 1 - score; // cyberbullying is class 0
        }

        return {
            cyberbullyingProbability: Math.round(cyberProb * 100),
            safeProbability: Math.round((1 - cyberProb) * 100),
            rawScore: score
        };
    }

    function customModelToDisplayResult(result) {
        var r = {
            score: 0,
            cats: {},
            flagged: [],
            weight: 0,
            sev: 'safe',
            aiDetail: '',
            aiSummary: '',
            type: 'image'
        };

        var cyberProb = result.cyberbullyingProbability;

        if (cyberProb > 70) {
            r.score = Math.round(cyberProb * 1.1);
            r.cats['cyberbullying'] = 1;
            r.aiSummary = 'Cyberbullying content detected by AI model (' + cyberProb + '% confidence)';
        } else if (cyberProb > 50) {
            r.score = Math.round(cyberProb * 0.8);
            r.cats['cyberbullying'] = 1;
            r.aiSummary = 'Possible cyberbullying content (' + cyberProb + '% confidence)';
        } else if (cyberProb > 30) {
            r.score = Math.round(cyberProb * 0.5);
            r.aiSummary = 'Low risk — slight cyberbullying indicators (' + cyberProb + '% confidence)';
        } else {
            r.score = 0;
            r.aiSummary = 'Image appears safe (' + result.safeProbability + '% confidence)';
        }

        r.score = Math.min(100, r.score);

        // Severity
        if (r.score <= 10) r.sev = 'safe';
        else if (r.score <= 30) r.sev = 'low';
        else if (r.score <= 55) r.sev = 'medium';
        else if (r.score <= 79) r.sev = 'high';
        else r.sev = 'critical';

        r.aiDetail = 'Custom AI Model Analysis:\n' +
            '  Cyberbullying: ' + cyberProb + '%\n' +
            '  Safe: ' + result.safeProbability + '%';

        return r;
    }

    async function analyzeImageWithNSFW(imgElement) {
        var model = await loadNSFWModel();
        if (!model) return null; // Model unavailable, skip visual analysis
        var predictions = await model.classify(imgElement);
        return predictions;
    }

    /* Map NSFWJS predictions to CyberGuard display result */
    function nsfwToDisplayResult(predictions) {
        var r = {
            score: 0,
            cats: {},
            flagged: [],
            weight: 0,
            sev: 'safe',
            aiDetail: '',
            aiSummary: '',
            type: 'image'
        };

        // Build a map of predictions
        var predMap = {};
        predictions.forEach(function (p) {
            predMap[p.className] = Math.round(p.probability * 100);
        });

        var nsfwScore = 0;
        var detailParts = [];
        var categories = [];

        // Porn — most severe
        if (predMap['Porn'] && predMap['Porn'] > 15) {
            nsfwScore += predMap['Porn'] * 1.2;
            categories.push('explicit');
            detailParts.push('Explicit/pornographic content detected (' + predMap['Porn'] + '% confidence)');
        }

        // Hentai — severe
        if (predMap['Hentai'] && predMap['Hentai'] > 15) {
            nsfwScore += predMap['Hentai'] * 1.0;
            categories.push('explicit');
            detailParts.push('Animated explicit content detected (' + predMap['Hentai'] + '% confidence)');
        }

        // Sexy — moderate
        if (predMap['Sexy'] && predMap['Sexy'] > 20) {
            nsfwScore += predMap['Sexy'] * 0.6;
            categories.push('profanity');
            detailParts.push('Suggestive/sexual content detected (' + predMap['Sexy'] + '% confidence)');
        }

        // Drawing — usually safe
        if (predMap['Drawing'] && predMap['Drawing'] > 50) {
            detailParts.push('Image appears to be a drawing/illustration (' + predMap['Drawing'] + '% confidence)');
        }

        // Neutral — safe
        if (predMap['Neutral'] && predMap['Neutral'] > 50) {
            detailParts.push('Image appears safe and neutral (' + predMap['Neutral'] + '% confidence)');
        }

        r.score = Math.min(100, Math.round(nsfwScore));

        // Set categories
        categories.forEach(function (c) {
            r.cats[c] = (r.cats[c] || 0) + 1;
        });

        // Build summary
        if (r.score <= 10) {
            r.aiSummary = 'Image is safe — no harmful content detected';
        } else if (r.score <= 30) {
            r.aiSummary = 'Mildly suggestive content detected';
        } else if (r.score <= 55) {
            r.aiSummary = 'Moderately inappropriate visual content';
        } else {
            r.aiSummary = 'Inappropriate/explicit visual content detected';
        }

        // Full detail breakdown
        r.aiDetail = detailParts.join('. ') + '.\n\nFull breakdown: ' +
            predictions.map(function (p) {
                return p.className + ': ' + Math.round(p.probability * 100) + '%';
            }).join(' · ');

        // Severity
        if (r.score <= 10) r.sev = 'safe';
        else if (r.score <= 30) r.sev = 'low';
        else if (r.score <= 55) r.sev = 'medium';
        else if (r.score <= 79) r.sev = 'high';
        else r.sev = 'critical';

        return r;
    }

    /* ---------- display results ---------- */
    function showResult(r) {
        q('#resultEmoji').textContent = SEV_EMOJI[r.sev];
        q('#resultTitle').textContent = SEV_TITLE[r.sev];
        q('#resultSubtitle').textContent = SEV_SUB[r.sev];

        var pill = q('#scorePill');
        pill.textContent = r.score;
        pill.className = 'score-pill' + (r.sev !== 'safe' ? ' sev-' + r.sev : '');

        var fill = q('#progressFill');
        fill.className = 'progress-fill' + (r.sev !== 'safe' ? ' sev-' + r.sev : '');
        setTimeout(function () { fill.style.width = r.score + '%'; }, 40);

        var catEl = q('#catTags');
        var catKeys = Object.keys(r.cats);
        if (catKeys.length === 0) {
            catEl.innerHTML = '<span class="cat-tag clean">✓ Clean</span>';
        } else {
            catEl.innerHTML = catKeys.map(function (c) {
                return '<span class="cat-tag ' + c + '">' + prettyName(c) + ' (' + r.cats[c] + ')</span>';
            }).join('');
        }

        var fEl = q('#flagTags');
        if (r.flagged && r.flagged.length > 0) {
            // Show actual flagged words (works for both text and image with OCR)
            fEl.innerHTML = r.flagged.map(function (w) {
                return '<span class="flag-tag">' + esc(w) + '</span>';
            }).join('');
        } else if (r.type === 'image') {
            if (r.aiSummary) {
                fEl.innerHTML = '<span class="clean-label"><i class="ph ph-image"></i> ' + esc(r.aiSummary) + '</span>';
            } else {
                fEl.innerHTML = '<span class="clean-label"><i class="ph ph-image"></i> Image analyzed</span>';
            }
        } else {
            fEl.innerHTML = '<span class="clean-label"><i class="ph ph-check-circle"></i> Nothing flagged</span>';
        }

        // Show AI detail box if available
        var aiBox = q('#aiDetailBox');
        if (r.aiDetail) {
            q('#aiDetailText').textContent = r.aiDetail;
            aiBox.classList.remove('hidden');
        } else {
            aiBox.classList.add('hidden');
        }

        var advice = r.type === 'image' ? getImageAdvice(r.sev) : ADVICE[r.sev];
        q('#adviceText').textContent = advice;
        var ab = q('#adviceBox');
        ab.className = 'box advice-box';
        if (r.sev === 'high' || r.sev === 'critical') ab.classList.add('danger');
        else if (r.sev === 'medium' || r.sev === 'low') ab.classList.add('warn');

        // Show API enhanced badge
        if (r.apiEnhanced) {
            q('#resultSubtitle').textContent = SEV_SUB[r.sev] + ' · AI Enhanced';
        }

        q('#resultArea').classList.remove('hidden');
    }

    function getImageAdvice(sev) {
        var adviceMap = {
            safe: "This image appears safe. No harmful or inappropriate content detected.",
            low: "Minor concerns detected in this image. May be fine depending on context.",
            medium: "This image contains some potentially inappropriate content. Review before sharing.",
            high: "This image contains clearly harmful or inappropriate content. Should be flagged for review.",
            critical: "This image contains severely harmful content. Recommend immediate removal and escalation."
        };
        return adviceMap[sev];
    }

    function prettyName(s) {
        return s.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /* ---------- image helpers ---------- */
    function fileToBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function loadImage(file) {
        currentImageFile = file;
        q('#imageInfo').textContent = file.name + ' · ' + formatFileSize(file.size);

        fileToBase64(file).then(function (base64) {
            currentImageBase64 = base64;
            q('#previewImg').src = base64;
            q('#uploadZone').classList.add('hidden');
            q('#imagePreview').classList.remove('hidden');
            q('#analyzeImageBtn').disabled = false;
        });
    }

    function clearImage() {
        currentImageFile = null;
        currentImageBase64 = null;
        q('#previewImg').src = '';
        q('#imagePreview').classList.add('hidden');
        q('#uploadZone').classList.remove('hidden');
        q('#imageInfo').textContent = 'No image selected';
        q('#analyzeImageBtn').disabled = true;
        q('#imageInput').value = '';
    }

    /* ---------- history ---------- */
    function pushHist(text, r, type) {
        history.unshift({
            text: text,
            sev: r.sev,
            score: r.score,
            cats: Object.keys(r.cats),
            ts: Date.now(),
            type: type || 'text'
        });
        if (history.length > 100) history.length = 100;
        try { localStorage.setItem('cg_hist', JSON.stringify(history)); } catch (e) { }
    }

    function renderHist(filter) {
        var list = history;
        if (filter) {
            var fl = filter.toLowerCase();
            list = history.filter(function (e) { return e.text.toLowerCase().indexOf(fl) !== -1; });
        }

        var table = q('#dataTable');
        var empty = q('#emptyMsg');

        if (list.length === 0) {
            table.classList.remove('visible');
            empty.classList.remove('hidden');
            return;
        }
        table.classList.add('visible');
        empty.classList.add('hidden');

        q('#tableBody').innerHTML = list.map(function (e, i) {
            var preview = e.text.length > 55 ? esc(e.text.substring(0, 55)) + '…' : esc(e.text);
            var typeIcon = e.type === 'image' ? '<i class="ph ph-image"></i>' : '<i class="ph ph-text-t"></i>';
            var typeLabel = e.type === 'image' ? 'Image' : 'Text';
            return '<tr>' +
                '<td>' + (list.length - i) + '</td>' +
                '<td title="' + esc(e.text) + '">' + preview + '</td>' +
                '<td>' + typeIcon + ' ' + typeLabel + '</td>' +
                '<td><span class="pill ' + e.sev + '">' + e.sev + '</span></td>' +
                '<td>' + e.score + '</td>' +
                '<td>' + ago(e.ts) + '</td>' +
                '</tr>';
        }).join('');
    }

    function ago(ts) {
        var d = Date.now() - ts;
        if (d < 60000) return 'just now';
        if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
        if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
        var dt = new Date(ts);
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /* ---------- dashboard ---------- */
    function refreshDash() {
        var total = history.length;
        var threats = history.filter(function (e) { return e.sev !== 'safe'; }).length;
        var rate = total > 0 ? Math.round(((total - threats) / total) * 100) : 100;
        var avg = total > 0 ? Math.round(history.reduce(function (s, e) { return s + e.score; }, 0) / total) : 0;

        q('#mTotal').textContent = total;
        q('#mThreats').textContent = threats;
        q('#mSafe').textContent = rate + '%';
        q('#mAvg').textContent = avg;

        q('#homeScans').textContent = total;
        q('#homeThreats').textContent = threats;

        var counts = { critical: 0, high: 0, medium: 0, low: 0, safe: 0 };
        history.forEach(function (e) { counts[e.sev] = (counts[e.sev] || 0) + 1; });
        var mx = Math.max(1, Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; })));

        ['Critical', 'High', 'Medium', 'Low', 'Safe'].forEach(function (label) {
            var key = label.toLowerCase();
            var bar = q('#bk' + label);
            var num = q('#bn' + label);
            if (bar) bar.style.width = (counts[key] / mx * 100) + '%';
            if (num) num.textContent = counts[key];
        });
    }

    /* ---------- init ---------- */
    document.addEventListener('DOMContentLoaded', function () {
        refreshDash();

        /* Navigation */
        qa('.nav-item').forEach(function (link) {
            link.addEventListener('click', function (e) {
                if (!this.dataset.page) return; // let normal links (e.g. Chat) navigate naturally
                e.preventDefault();
                goTo(this.dataset.page);
            });
        });

        q('#logoLink').addEventListener('click', function (e) { e.preventDefault(); goTo('home'); });
        q('#hamburger').addEventListener('click', function () { q('#navItems').classList.toggle('open'); });
        q('#goDetect').addEventListener('click', function () { goTo('detect'); });

        /* Learn more smooth scroll */
        var learnBtn = q('#goLearn');
        if (learnBtn) {
            learnBtn.addEventListener('click', function () {
                var featSection = q('#featuresSection');
                if (featSection) featSection.scrollIntoView({ behavior: 'smooth' });
            });
        }

        /* ---------- Dark Mode Toggle ---------- */
        (function initTheme() {
            var saved = null;
            try { saved = localStorage.getItem('cyberguard-theme'); } catch (e) { }
            if (saved === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else if (saved === 'light') {
                document.documentElement.removeAttribute('data-theme');
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        })();

        var themeBtn = q('#themeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                if (isDark) {
                    document.documentElement.removeAttribute('data-theme');
                    try { localStorage.setItem('cyberguard-theme', 'light'); } catch (e) { }
                } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    try { localStorage.setItem('cyberguard-theme', 'dark'); } catch (e) { }
                }
            });
        }

        /* Tab switching */
        qa('.detect-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                qa('.detect-tab').forEach(function (t) { t.classList.remove('active'); });
                qa('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
                this.classList.add('active');
                var panel = q('#panel' + this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1));
                if (panel) panel.classList.add('active');
                // Hide results when switching tabs
                q('#resultArea').classList.add('hidden');
                q('#progressFill').style.width = '0%';
            });
        });

        /* Text input */
        q('#textInput').addEventListener('input', function () {
            q('#charInfo').textContent = this.value.length + ' chars';
        });

        q('#sampleBtn').addEventListener('click', function () {
            var s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
            q('#textInput').value = s;
            q('#charInfo').textContent = s.length + ' chars';
        });

        q('#clearBtn').addEventListener('click', function () {
            q('#textInput').value = '';
            q('#charInfo').textContent = '0 chars';
            q('#resultArea').classList.add('hidden');
            q('#progressFill').style.width = '0%';
        });

        /* Text analysis (keyword + OpenAI Moderation API) */
        q('#analyzeBtn').addEventListener('click', async function () {
            var text = q('#textInput').value.trim();
            if (!text) return;

            q('#resultArea').classList.add('hidden');
            q('#loading').classList.remove('hidden');
            q('#loadingText').textContent = 'Scanning text with AI...';
            q('#progressFill').style.width = '0%';

            // Run keyword scan immediately
            var localResult = scan(text);

            // Run OpenAI moderation in parallel
            var apiResult = await moderateTextWithAPI(text);

            // Merge results
            var merged = mergeAPIResult(localResult, apiResult);

            q('#loading').classList.add('hidden');
            if (merged) {
                showResult(merged);
                pushHist(text, merged, 'text');
                refreshDash();
            }
        });

        /* Image upload - click to browse */
        q('#uploadZone').addEventListener('click', function () {
            q('#imageInput').click();
        });

        q('#imageInput').addEventListener('change', function () {
            if (this.files && this.files[0]) {
                var file = this.files[0];
                if (file.size > 10 * 1024 * 1024) {
                    alert('File too large. Maximum size is 10 MB.');
                    return;
                }
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }
                loadImage(file);
            }
        });

        /* Image upload - drag & drop */
        var zone = q('#uploadZone');
        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', function () {
            this.classList.remove('drag-over');
        });
        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                var file = e.dataTransfer.files[0];
                if (!file.type.startsWith('image/')) {
                    alert('Please drop an image file.');
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    alert('File too large. Maximum size is 10 MB.');
                    return;
                }
                loadImage(file);
            }
        });

        /* Remove image */
        q('#removeImage').addEventListener('click', function (e) {
            e.stopPropagation();
            clearImage();
            q('#resultArea').classList.add('hidden');
            q('#progressFill').style.width = '0%';
        });

        /* Image analysis: Custom AI Model + NSFWJS (visual) + OCR text scan (text in images) */
        q('#analyzeImageBtn').addEventListener('click', async function () {
            if (!currentImageBase64) return;

            q('#resultArea').classList.add('hidden');
            q('#loading').classList.remove('hidden');
            q('#loadingText').textContent = 'Analyzing image...';
            q('#progressFill').style.width = '0%';

            try {
                var imgEl = q('#previewImg');
                var detailParts = [];

                // --- Custom AI Model analysis (trained cyberbullying classifier) ---
                var customResult = null;
                try {
                    q('#loadingText').textContent = 'Running custom AI model...';
                    customResult = await analyzeImageWithCustomModel(imgEl);
                } catch (e) {
                    console.warn('Custom model skipped:', e.message);
                }

                // --- Gemini Vision API analysis ---
                var geminiResult = null;
                try {
                    q('#loadingText').textContent = 'Running Gemini Vision synthesis...';
                    geminiResult = await analyzeImageWithGemini(currentImageBase64, currentImageFile.type);
                } catch (e) {
                    console.warn('Gemini skipped:', e.message);
                }

                // --- NSFWJS visual analysis (optional, may fail) ---
                var predictions = null;
                try {
                    q('#loadingText').textContent = 'Checking visual content...';
                    predictions = await analyzeImageWithNSFW(imgEl);
                } catch (e) {
                    console.warn('NSFWJS skipped:', e.message);
                }

                // --- OCR text extraction ---
                var extractedText = '';
                try {
                    if (typeof Tesseract !== 'undefined') {
                        q('#loadingText').textContent = 'Extracting text from image...';
                        var ocrResult = await Tesseract.recognize(currentImageBase64, 'eng');
                        extractedText = (ocrResult.data.text || '').trim();
                    } else {
                        console.warn('Tesseract.js not loaded, skipping OCR');
                    }
                } catch (e) {
                    console.warn('OCR failed:', e.message);
                }

                // --- Build display result (start with custom model or NSFWJS) ---
                var displayResult;

                // Priority 1: Custom trained model
                if (customResult) {
                    displayResult = customModelToDisplayResult(customResult);
                    detailParts.push(displayResult.aiDetail || '');
                    detailParts.push(''); // spacer
                }

                // Priority 2: NSFWJS
                if (predictions) {
                    var nsfwResult = nsfwToDisplayResult(predictions);
                    if (displayResult) {
                        // Merge NSFWJS into custom model result
                        for (var nsfwCat in nsfwResult.cats) {
                            displayResult.cats[nsfwCat] = (displayResult.cats[nsfwCat] || 0) + nsfwResult.cats[nsfwCat];
                        }
                        displayResult.score = Math.min(100, Math.max(displayResult.score, nsfwResult.score));
                        detailParts.push('NSFW Analysis: ' + (nsfwResult.aiDetail || ''));
                    } else {
                        displayResult = nsfwResult;
                        detailParts.push(displayResult.aiDetail || '');
                    }
                }

                // Fallback: no models available
                if (!displayResult) {
                    displayResult = {
                        score: 0,
                        cats: {},
                        flagged: [],
                        weight: 0,
                        sev: 'safe',
                        aiDetail: '',
                        aiSummary: '',
                        type: 'image'
                    };
                    detailParts.push('Visual content analysis: no models available');
                }

                displayResult.type = 'image';

                // --- Merge OCR text scan ---
                if (extractedText.length > 2) {
                    var textScanResult = scan(extractedText);
                    if (textScanResult) {
                        for (var cat in textScanResult.cats) {
                            displayResult.cats[cat] = (displayResult.cats[cat] || 0) + textScanResult.cats[cat];
                        }
                        textScanResult.flagged.forEach(function (w) {
                            if (displayResult.flagged.indexOf(w) === -1) {
                                displayResult.flagged.push(w);
                            }
                        });
                        displayResult.score = Math.min(100, displayResult.score + textScanResult.score);

                        if (textScanResult.score > 10) {
                            displayResult.aiSummary = 'Harmful text detected in image';
                        }
                    }
                    var ocrPreview = extractedText.length > 150 ? extractedText.substring(0, 150) + '...' : extractedText;
                    detailParts.push('Text found in image: "' + ocrPreview + '"');
                } else {
                    detailParts.push('No readable text detected in this image.');
                }

                // Recalculate severity after all merges
                if (displayResult.score <= 10) displayResult.sev = 'safe';
                else if (displayResult.score <= 30) displayResult.sev = 'low';
                else if (displayResult.score <= 55) displayResult.sev = 'medium';
                else if (displayResult.score <= 79) displayResult.sev = 'high';
                else displayResult.sev = 'critical';

                // --- Merge Gemini Text result ---
                // Priority Override: If Gemini says it is harmful, it immediately becomes critical.
                if (geminiResult) {
                    if (typeof geminiResult === 'object' && geminiResult.error) {
                        displayResult.aiDetail = '⚠️ GEMINI API ERROR: ' + geminiResult.message + '\n\n' + displayResult.aiDetail;
                        detailParts.unshift('Gemini API Error: ' + geminiResult.message);
                    } else if (typeof geminiResult === 'string') {
                        var isGeminiSafe = geminiResult.toLowerCase().includes('safe') && !geminiResult.toLowerCase().includes('not safe') && !geminiResult.toLowerCase().includes('harmful');
                        if (isGeminiSafe) {
                            displayResult.score = Math.floor(displayResult.score * 0.5); // Heavily decrease score if Gemini explicitly says safe
                        } else {
                            // Gemini caught something harmful. This overrides everything.
                            displayResult.score = 100; // Force maximum score
                            displayResult.sev = 'critical';
                            displayResult.aiSummary = 'Critical content detected by Gemini Vision';
                        }

                        // Add Gemini reasoning to the top of the details
                        detailParts.unshift('Gemini Primary Analysis: ' + geminiResult.trim());
                    }
                }

                // Recalculate severity one final time just to be safe
                if (displayResult.score <= 10) displayResult.sev = 'safe';
                else if (displayResult.score <= 30) displayResult.sev = 'low';
                else if (displayResult.score <= 55) displayResult.sev = 'medium';
                else if (displayResult.score <= 79) displayResult.sev = 'high';
                else displayResult.sev = 'critical';

                // Mark how many AI layers were used
                var aiLayers = [];

                if (customResult) aiLayers.push('Custom AI');
                if (geminiResult) aiLayers.push('Gemini');
                if (predictions) aiLayers.push('NSFW');
                if (extractedText.length > 2) aiLayers.push('OCR');
                if (aiLayers.length > 0) {
                    displayResult.apiEnhanced = true;
                }

                displayResult.aiDetail = detailParts.filter(Boolean).join('\n\n');

                q('#loading').classList.add('hidden');
                showResult(displayResult);

                var fileName = currentImageFile ? currentImageFile.name : 'Uploaded image';
                pushHist('[Image] ' + fileName, displayResult, 'image');
                refreshDash();
            } catch (err) {
                q('#loading').classList.add('hidden');
                var errorResult = {
                    score: 0,
                    cats: {},
                    flagged: [],
                    sev: 'safe',
                    type: 'image',
                    aiDetail: 'Error: ' + err.message + '. Please reload the page and try again.',
                    aiSummary: 'Analysis failed'
                };
                showResult(errorResult);
            }
        });

        /* History */
        q('#searchField').addEventListener('input', function () { renderHist(this.value); });
        q('#clearAllBtn').addEventListener('click', function () {
            history = [];
            try { localStorage.removeItem('cg_hist'); } catch (e) { }
            renderHist();
            refreshDash();
        });

        q('#goDetect2').addEventListener('click', function (e) { e.preventDefault(); goTo('detect'); });
    });
})();
