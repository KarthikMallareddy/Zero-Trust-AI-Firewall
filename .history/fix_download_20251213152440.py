import urllib.request
import os

print("⬇️  Starting Repair Process (Switching to MobileNet V1 Lite)...")

# We are switching to V1 because the V2 links were broken. 
# We must re-download BOTH files so they match.
files = {
    # The Brain Map
    "model.json": "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json",
    # The Brain Weights
    "group1-shard1of1.bin": "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/group1-shard1of1.bin",
    # The Engine (Keep the same)
    "tf.min.js": "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js"
}

for filename, url in files.items():
    print(f"Downloading {filename}...")
    try:
        # Download
        urllib.request.urlretrieve(url, filename)
        
        # Verify Size
        size_kb = os.path.getsize(filename) / 1024
        
        # Check for XML errors (File too small)
        if filename.endswith(".bin") and size_kb < 100:
             print(f"❌ ERROR: {filename} is too small ({size_kb:.1f} KB). Still XML junk.")
        else:
             print(f"✅ SUCCESS: {filename} saved! Size: {size_kb:.1f} KB")
            
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")

print("\nDONE. Please reload your extension now.")