import os
import json
import shutil
import uuid

# Configuration
SOURCE_DIR = 'prod'
DEST_DIR = 'assets/images/uploads'
DATA_FILE = 'assets/data/products.json'

# Ensure destination exists
os.makedirs(DEST_DIR, exist_ok=True)

def load_products():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_products(products):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

def main():
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Directory '{SOURCE_DIR}' not found.")
        return

    products = load_products()
    
    # Determine the next ID
    next_id = 1
    if products:
        next_id = max(p['id'] for p in products) + 1

    files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    print(f"Found {len(files)} images to process...")

    count = 0
    for filename in files:
        # Generate new filename to avoid conflicts/encoding issues
        ext = os.path.splitext(filename)[1]
        new_filename = f"{uuid.uuid4()}{ext}"
        
        src_path = os.path.join(SOURCE_DIR, filename)
        dest_path = os.path.join(DEST_DIR, new_filename)
        
        # Copy file
        try:
            shutil.copy2(src_path, dest_path)
        except Exception as e:
            print(f"Failed to copy {filename}: {e}")
            continue

        # Create Product Name from Filename (remove extension and replace underscores)
        product_name = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ')
        
        # Create Product Entry
        new_product = {
            "id": next_id,
            "name": product_name,
            "price": 0,
            "original_price": 0,
            "rating": 0,
            "sold": 0,
            "category": "Autres",
            "image": f"{DEST_DIR}/{new_filename}",
            "images": [f"{DEST_DIR}/{new_filename}"],
            "description": "Description à mettre à jour."
        }
        
        products.append(new_product)
        next_id += 1
        count += 1
        try:
            print(f"Imported: Product {new_product['id']}")
        except:
            pass

    save_products(products)
    print(f"\nSuccess! Imported {count} products.")
    print("Please refresh your dashboard.")

if __name__ == "__main__":
    main()
