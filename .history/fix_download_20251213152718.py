import urllib.request
import json
import os

# 1. Base URL where we found the model.json
base_url = "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/"

print("🔍 Reading model.json to find the correct binary filename...")

try:
    # Open the model.json you already downloaded
    with open("model.json", "r") as f:
        data = json.load(f)
        
    # Find the filename inside the JSON 'weightsManifest'
    # It usually looks like ["group1-shard1of1.bin"]
    bin_filename = data['weightsManifest'][0]['paths'][0]
    print(f"✅ Found correct filename in JSON: {bin_filename}")

    # 2. Construct the full URL
    full_bin_url = base_url + bin_filename
    print(f"⬇️  Downloading from: {full_bin_url}")

    # 3. Download the specific binary file
    urllib.request.urlretrieve(full_bin_url, bin_filename)
    
    # 4. Verify Size
    size_kb = os.path.getsize(bin_filename) / 1024
    print(f"✅ SUCCESS! {bin_filename} saved. Size: {size_kb:.1f} KB")

except FileNotFoundError:
    print("❌ Error: Could not find model.json. Please run the previous script to get it first.")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n🚀 Ready to reload extension.")