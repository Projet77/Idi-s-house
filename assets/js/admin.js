
document.addEventListener('DOMContentLoaded', () => {
    const productsTableBody = document.getElementById('productsTableBody');
    const totalProductsEl = document.getElementById('totalProducts');
    const totalCategoriesEl = document.getElementById('totalCategories');
    const modal = document.getElementById('productModal');
    const addProductBtn = document.getElementById('addProductBtn');
    const closeModal = document.querySelector('.close-modal');
    const addProductForm = document.getElementById('addProductForm');

    // Edit Mode Variables
    let isEditMode = false;
    let currentEditId = null;

    // Fetch and display products
    function loadProducts() {
        console.log("Chargement des produits...");
        fetch('assets/data/products.json?t=' + new Date().getTime())
            .then(response => response.json())
            .then(products => {
                console.log("Produits chargés:", products);
                renderTable(products);
                updateStats(products);
            })
            .catch(error => console.error('Erreur chargement produits:', error));
    }

    function renderTable(products) {
        productsTableBody.innerHTML = '';
        products.forEach(product => {
            // Support legacy "image" and new "images" array
            let mainImage = product.image;
            if (product.images && product.images.length > 0) {
                mainImage = product.images[0];
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${mainImage}" alt="${product.name}" class="product-thumb"></td>
                <td><strong>${product.name}</strong></td>
                <td><span class="category-tag">${product.category}</span></td>
                <td>${Number(product.price).toLocaleString()} FCFA</td>
                <td>
                    <button class="btn-action edit-btn" data-id="${product.id}" title="Éditer"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-delete delete-btn" data-id="${product.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
                </td>
            `;
            productsTableBody.appendChild(tr);
        });

        // Attach event listeners to new buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const product = products.find(p => p.id === id);
                openEditModal(product);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
                    deleteProduct(id);
                }
            });
        });
    }

    function updateStats(products) {
        totalProductsEl.textContent = products.length;
        const categories = new Set(products.map(p => p.category));
        totalCategoriesEl.textContent = categories.size;
    }

    function deleteProduct(id) {
        fetch(`/api/products/${id}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    loadProducts();
                } else {
                    alert('Erreur: ' + data.message);
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // Modal Handling
    function resetImageInputs() {
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`imageInput${i}`).value = '';
            document.getElementById(`imageUrl${i}`).value = '';
            document.getElementById(`preview${i}`).src = '';
            document.getElementById(`preview${i}`).style.display = 'none';
        }
    }

    function openAddModal() {
        modal.style.display = 'flex';
        addProductForm.reset();
        isEditMode = false;
        currentEditId = null;
        modal.querySelector('h2').textContent = 'Ajouter un Produit';
        modal.querySelector('.btn-submit').textContent = 'Enregistrer';
        resetImageInputs();
    }

    function openEditModal(product) {
        modal.style.display = 'flex';
        isEditMode = true;
        currentEditId = product.id;
        modal.querySelector('h2').textContent = 'Modifier le Produit';
        modal.querySelector('.btn-submit').textContent = 'Mettre à jour';

        // Fill form
        const form = addProductForm;
        form.name.value = product.name;
        form.category.value = product.category;
        form.price.value = product.price;
        form.original_price.value = product.original_price || '';
        form.description.value = product.description;

        resetImageInputs();

        // Populate Images
        let currentImages = [];
        if (product.images && Array.isArray(product.images)) {
            currentImages = product.images;
        } else if (product.image) {
            currentImages = [product.image];
        }

        currentImages.forEach((imgUrl, index) => {
            if (index < 4) {
                const i = index + 1;
                document.getElementById(`imageUrl${i}`).value = imgUrl;
                const preview = document.getElementById(`preview${i}`);
                preview.src = imgUrl;
                preview.style.display = 'block';
            }
        });
    }

    addProductBtn.addEventListener('click', openAddModal);

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Helper to upload single file
    async function uploadFile(file) {
        const uploadData = new FormData();
        uploadData.append('file', file);
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData
        });
        const result = await response.json();
        if (result.status === 'success') {
            return result.url;
        } else {
            throw new Error(result.message);
        }
    }

    // Form Submission
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = addProductForm.querySelector('.btn-submit');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Traitement...';
        submitBtn.disabled = true;

        const formData = new FormData(addProductForm);
        let finalImages = [];

        try {
            // Process 4 image slots
            for (let i = 1; i <= 4; i++) {
                const fileInput = document.getElementById(`imageInput${i}`);
                const hiddenInput = document.getElementById(`imageUrl${i}`);
                let url = hiddenInput.value;

                if (fileInput.files.length > 0) {
                    url = await uploadFile(fileInput.files[0]);
                }

                if (url) {
                    finalImages.push(url);
                }
            }

            if (finalImages.length === 0) {
                alert('Veuillez ajouter au moins une image.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }

            // 2. Create/Update Product
            const productData = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: Number(formData.get('price')),
                original_price: Number(formData.get('original_price')),
                image: finalImages[0], // Main image for backward compatibility
                images: finalImages,    // New array
                description: formData.get('description'),
                rating: 0,
                sold: 0
            };

            let url = '/api/products';
            let method = 'POST';

            if (isEditMode && currentEditId) {
                url = `/api/products/${currentEditId}`;
                method = 'PUT';
                delete productData.rating;
                delete productData.sold;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            const data = await response.json();

            if (data.status === 'success') {
                modal.style.display = 'none';
                addProductForm.reset();
                resetImageInputs();
                loadProducts();
            } else {
                alert('Erreur: ' + data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Erreur: ' + error.message);
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Image Preview Logic for all 4 inputs
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`imageInput${i}`).addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const preview = document.getElementById(`preview${i}`);
                    preview.style.display = 'block';
                    preview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Initial Load
    loadProducts();
});
