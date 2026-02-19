
import http.server
import socketserver
import json
import os
import re
import sys
from email.parser import BytesParser
from email import policy

# Configuration
START_PORT = 8000
MAX_PORT_RETRIES = 10
DATA_FILE = 'assets/data/products.json'
UPLOAD_DIR = 'assets/images/uploads'

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def _read_products(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

    def _write_products(self, products):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(products, f, indent=2, ensure_ascii=False)

    def _send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_POST(self):
        if self.path == '/api/upload':
            try:
                # Parse the multipart request
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                # Create a minimal set of headers for the parser
                headers = b'Content-Type: ' + self.headers['Content-Type'].encode('utf-8') + b'\r\n\r\n'
                msg = BytesParser(policy=policy.default).parsebytes(headers + post_data)
                
                file_url = None
                
                # Iterate through parts to find the file
                for part in msg.iter_parts():
                    if part.get_filename():
                        filename = os.path.basename(part.get_filename())
                        # Sanitize filename (simple)
                        filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
                        
                        file_path = os.path.join(UPLOAD_DIR, filename)
                        
                        # Write the file
                        with open(file_path, 'wb') as f:
                            f.write(part.get_payload(decode=True))
                            
                        file_url = f"{UPLOAD_DIR}/{filename}".replace('\\', '/')
                        break
                
                if file_url:
                    self._send_json_response({'status': 'success', 'url': file_url})
                else:
                    self._send_json_response({'status': 'error', 'message': 'No file found'}, 400)

            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json_response({'status': 'error', 'message': str(e)}, 500)

        elif self.path == '/api/products':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                new_product = json.loads(post_data)
                
                products = self._read_products()
                
                # Auto-increment ID
                if not any(p['id'] == new_product.get('id') for p in products):
                     max_id = max([p.get('id', 0) for p in products]) if products else 0
                     new_product['id'] = max_id + 1

                products.append(new_product)
                self._write_products(products)
                
                self._send_json_response({'status': 'success', 'message': 'Product added', 'product': new_product})
                
            except Exception as e:
                self._send_json_response({'status': 'error', 'message': str(e)}, 500)
        else:
            self.send_error(404, "File not found")

    def do_DELETE(self):
        # Match /api/products/<id>
        match = re.search(r'/api/products/(\d+)', self.path)
        if match:
            product_id = int(match.group(1))
            try:
                products = self._read_products()
                initial_count = len(products)
                products = [p for p in products if p.get('id') != product_id]
                
                if len(products) < initial_count:
                    self._write_products(products)
                    self._send_json_response({'status': 'success', 'message': 'Product deleted'})
                else:
                    self._send_json_response({'status': 'error', 'message': 'Product not found'}, 404)
            except Exception as e:
                self._send_json_response({'status': 'error', 'message': str(e)}, 500)
        else:
            self.send_error(404, "File not found")

    def do_PUT(self):
        # Match /api/products/<id>
        match = re.search(r'/api/products/(\d+)', self.path)
        if match:
            product_id = int(match.group(1))
            try:
                content_length = int(self.headers['Content-Length'])
                put_data = self.rfile.read(content_length)
                updated_data = json.loads(put_data)
                
                products = self._read_products()
                product_found = False
                
                for i, p in enumerate(products):
                    if p.get('id') == product_id:
                        # Update product fields
                        products[i].update(updated_data)
                        # Ensure ID remains the same
                        products[i]['id'] = product_id 
                        product_found = True
                        break
                
                if product_found:
                    self._write_products(products)
                    self._send_json_response({'status': 'success', 'message': 'Product updated'})
                else:
                    self._send_json_response({'status': 'error', 'message': 'Product not found'}, 404)
                    
            except Exception as e:
                 self._send_json_response({'status': 'error', 'message': str(e)}, 500)
        else:
            self.send_error(404, "File not found")

# Allow address reuse to prevent "Address already in use" errors on quick restarts
socketserver.TCPServer.allow_reuse_address = True

def run_server():
    for port in range(START_PORT, START_PORT + MAX_PORT_RETRIES):
        try:
            with socketserver.TCPServer(("", port), CustomHandler) as httpd:
                print(f"Serving at http://localhost:{port}")
                print(f"Admin Dashboard: http://localhost:{port}/admin.html")
                httpd.serve_forever()
                return
        except OSError as e:
            if e.winerror == 10048: # Address already in use
                print(f"Port {port} is in use, trying {port + 1}...")
                continue
            else:
                raise e
    
    print(f"Error: Could not find a free port between {START_PORT} and {START_PORT + MAX_PORT_RETRIES - 1}")

if __name__ == "__main__":
    run_server()
