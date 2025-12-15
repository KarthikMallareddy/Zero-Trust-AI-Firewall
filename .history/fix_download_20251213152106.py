import urllib.request
import os

# The exact files we need
files = {
    "group1-shard1of1.bin": "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/group1-shard1of1.bin",
    "model.json": "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json",
    "tf.min.js": "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js"
}

print("⬇️  Starting Repair Process...")

for filename, url in files.items():
    print(f"Downloading {filename}...")
    try:
        # Download the file
        urllib.request.urlretrieve(url, filename)
        
        # Check size to confirm it's not XML error
        size_kb = os.path.getsize(filename) / 1024
        
        if filename.endswith(".bin") and size_kb < 100:
            print(f"❌ ERROR: {filename} is too small ({size_kb:.1f} KB). It is likely XML junk.")
        else:
            print(f"✅ SUCCESS: {filename} saved! Size: {size_kb:.1f} KB")
            
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")

print("\nDONE. If you see SUCCESS above, you are ready.")