import urllib.request
import json
import os
import ssl

# Ignore SSL certificate errors (fixes some download issues)
ssl._create_default_https_context = ssl._create_unverified_context

BASE_URL = "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/"
MODEL_FILE = "model.json"

def download_file(url, filename):
    print(f"⬇️  Downloading {filename}...", end=" ")
    try:
        urllib.request.urlretrieve(url, filename)
        size = os.path.getsize(filename) / 1024
        print(f"✅ ({size:.1f} KB)")
    except Exception as e:
        print(f"❌ FAILED: {e}")

# 1. Download the Map (model.json) first if missing
if not os.path.exists(MODEL_FILE):
    print("🔍 model.json not found. Downloading...")
    download_file(BASE_URL + MODEL_FILE, MODEL_FILE)

# 2. Read the Map to find the Shards
print("🧠 Reading model.json...")
with open(MODEL_FILE, "r") as f:
    model_data = json.load(f)

# 3. Extract all file names from the manifest
shard_filenames = []
if 'weightsManifest' in model_data:
    for group in model_data['weightsManifest']:
        shard_filenames.extend(group['paths'])

print(f"⚡ Found {len(shard_filenames)} shards to download.")

# 4. Download every shard
for shard in shard_filenames:
    if not os.path.exists(shard):
        download_file(BASE_URL + shard, shard)
    else:
        print(f"⏩ Skipping {shard} (Already exists)")

print("\n🎉 All files downloaded! Reload your extension now.")