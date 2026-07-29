# ============================================================
# constants.py
# Single source of truth for subreddits and pipeline config.
# ============================================================

# ============================================================
# SUBREDDITS
# ============================================================

# --- Everyday frustrations ---
SUBREDDITS_GENERAL = [
    "mildlyinfuriating",
    "firstworldproblems",
    "rant",
    "complaints",
    "tifu",
    "CasualConversation",
    "self",
]

# --- Work & business ---
SUBREDDITS_BUSINESS = [
    "Entrepreneur",
    "startups",
    "smallbusiness",
    "SideProject",
    "SideHustle",
    "freelance",
    "productivity",
    "SaaS",
    "Marketing",
    "Sales",
]

# --- Developer tools ---
SUBREDDITS_DEVELOPER = [
    "programming",
    "webdev",
    "learnprogramming",
    "devops",
    "ExperiencedDevs",
    "cscareerquestions",
    "softwaregore",
    "TalesFromTechSupport",
    "techsupport",
]

# --- Healthcare ---
SUBREDDITS_HEALTHCARE = [
    "medical",
    "nursing",
    "healthcare",
    "AskDocs",
]

# --- Mental health & wellness ---
SUBREDDITS_MENTAL_HEALTH = [
    "mentalhealth",
    "anxiety",
    "depression",
    "therapy",
    "selfimprovement",
]

# --- Fintech & personal finance ---
SUBREDDITS_FINANCE = [
    "personalfinance",
    "povertyfinance",
    "Frugal",
    "investing",
    "financialindependence",
]

# --- Education ---
SUBREDDITS_EDUCATION = [
    "Teachers",
    "college",
    "OnlineLearning",
    "GradSchool",
    "learnprogramming",
]

# --- Legal ---
SUBREDDITS_LEGAL = [
    "legaladvice",
    "law",
]

# --- HR & Recruiting ---
SUBREDDITS_HR = [
    "jobs",
    "recruitinghell",
    "careerguidance",
    "resumes",
    "humanresources",
]

# --- E-commerce ---
SUBREDDITS_ECOMMERCE = [
    "ecommerce",
    "dropshipping",
    "amazonseller",
    "Flipping",
]

# --- Food & beverage ---
SUBREDDITS_FOOD = [
    "food",
    "restaurantowners",
    "cooking",
    "KitchenConfidential",
]

# --- Real estate & housing ---
SUBREDDITS_HOUSING = [
    "moving",
    "renting",
    "urbanplanning",
    "FirstTimeHomeBuyer",
    "RealEstate",
]

# --- Transportation ---
SUBREDDITS_TRANSPORT = [
    "cycling",
    "electricvehicles",
    "PublicFreakout",
    "transit",
    "cars",
]

# --- Parenting & family ---
SUBREDDITS_PARENTING = [
    "Parenting",
    "relationship_advice",
    "daddit",
    "Mommit",
]

# --- Home & living ---
SUBREDDITS_HOME = [
    "lifehacks",
    "YouShouldKnow",
    "DIY",
    "HomeImprovement",
    "ZeroWaste",
]

# --- Sustainability ---
SUBREDDITS_SUSTAINABILITY = [
    "ZeroWaste",
    "sustainability",
    "environment",
    "Anticonsumption",
]

# --- Gaming ---
SUBREDDITS_GAMING = [
    "gaming",
    "gamedev",
    "indiegaming",
    "patientgamers",
]

# --- Marketing & sales ---
SUBREDDITS_MARKETING = [
    "marketing",
    "PPC",
    "SEO",
    "content_marketing",
    "socialmedia",
]

# --- Consumer frustrations ---
SUBREDDITS_CONSUMER = [
    "TalesFromRetail",
    "TalesFromYourServer",
    "CustomerService",
]


# ============================================================
# COMBINED SUBREDDIT LIST
# ============================================================

SUBREDDITS = list(set(
    SUBREDDITS_GENERAL +
    SUBREDDITS_BUSINESS +
    SUBREDDITS_DEVELOPER +
    SUBREDDITS_HEALTHCARE +
    SUBREDDITS_MENTAL_HEALTH +
    SUBREDDITS_FINANCE +
    SUBREDDITS_EDUCATION +
    SUBREDDITS_LEGAL +
    SUBREDDITS_HR +
    SUBREDDITS_ECOMMERCE +
    SUBREDDITS_FOOD +
    SUBREDDITS_HOUSING +
    SUBREDDITS_TRANSPORT +
    SUBREDDITS_PARENTING +
    SUBREDDITS_HOME +
    SUBREDDITS_SUSTAINABILITY +
    SUBREDDITS_GAMING +
    SUBREDDITS_MARKETING +
    SUBREDDITS_CONSUMER
))


# ============================================================
# QWEN MODEL CONFIG
# ============================================================
# Qwen powers problem filtering and problem-statement extraction.

CLASSIFIER_CONFIG = {
    "qwen_model_id": "Qwen/Qwen3.5-9B",
}

# The embedding worker uses the OpenAI embeddings endpoint synchronously.
EMBEDDING_CONFIG = {
    "model_id": "text-embedding-3-large",
    "dimensions": 3072,
}


# ============================================================
# PIPELINE VERSION
# ============================================================
# Stamped onto every row written to Supabase so the frontend can show only data
# produced by the current pipeline. Legacy data is "v1".
PIPELINE_VERSION = "v2"
