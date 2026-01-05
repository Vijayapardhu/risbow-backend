// API Configuration
const API_BASE_URL = 'http://localhost:3000/api/v1';

// State Management
const state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    currentPage: 'overview'
};

// API Service
class API {
    static async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async sendOTP(mobile) {
        return this.request('/auth/otp-send', {
            method: 'POST',
            body: JSON.stringify({ mobile })
        });
    }

    static async verifyOTP(mobile, otp) {
        return this.request('/auth/otp-verify', {
            method: 'POST',
            body: JSON.stringify({ mobile, otp })
        });
    }

    static async getProfile() {
        return this.request('/users/me');
    }

    static async getCoins() {
        return this.request('/users/me/coins');
    }

    static async getProducts() {
        return this.request('/products');
    }

    static async createProduct(data) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getRooms() {
        return this.request('/rooms');
    }

    static async createRoom(data) {
        return this.request('/rooms', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// UI Controller
class UI {
    static showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    static showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageId}-page`).classList.add('active');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        const titles = {
            overview: 'Dashboard Overview',
            products: 'Product Management',
            rooms: 'Room Management',
            orders: 'Order Tracking',
            profile: 'User Profile'
        };
        document.getElementById('page-title').textContent = titles[pageId];
        state.currentPage = pageId;
    }

    static showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    static hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    static showLoading(elementId) {
        document.getElementById(elementId).classList.remove('hidden');
    }

    static hideLoading(elementId) {
        document.getElementById(elementId).classList.add('hidden');
    }

    static showError(message) {
        alert(`Error: ${message}`);
    }

    static showSuccess(message) {
        alert(`Success: ${message}`);
    }
}

// Authentication
class Auth {
    static async sendOTP() {
        const mobile = document.getElementById('mobile').value;
        if (!mobile) {
            UI.showError('Please enter mobile number');
            return;
        }

        UI.showLoading('login-loading');
        try {
            await API.sendOTP(mobile);
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('otp-form').classList.remove('hidden');
            UI.hideLoading('login-loading');
        } catch (error) {
            UI.hideLoading('login-loading');
            UI.showError(error.message);
        }
    }

    static async verifyOTP() {
        const mobile = document.getElementById('mobile').value;
        const otp = document.getElementById('otp').value;

        if (!otp) {
            UI.showError('Please enter OTP');
            return;
        }

        UI.showLoading('login-loading');
        try {
            const response = await API.verifyOTP(mobile, otp);
            state.token = response.access_token;
            state.user = response.user;
            localStorage.setItem('token', state.token);
            localStorage.setItem('user', JSON.stringify(state.user));

            UI.hideLoading('login-loading');
            UI.showScreen('dashboard-screen');
            Dashboard.init();
        } catch (error) {
            UI.hideLoading('login-loading');
            UI.showError(error.message);
        }
    }

    static logout() {
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        UI.showScreen('login-screen');
        document.getElementById('otp-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('mobile').value = '';
        document.getElementById('otp').value = '';
    }
}

// Dashboard
class Dashboard {
    static async init() {
        this.loadUserInfo();
        this.loadOverview();
    }

    static loadUserInfo() {
        if (state.user) {
            document.getElementById('user-mobile').textContent = state.user.mobile;
        }
    }

    static async loadOverview() {
        try {
            const [products, rooms, coins] = await Promise.all([
                API.getProducts(),
                API.getRooms(),
                API.getCoins()
            ]);

            document.getElementById('total-products').textContent = products.length || 0;
            document.getElementById('total-rooms').textContent = rooms.length || 0;
            document.getElementById('total-orders').textContent = '0'; // Placeholder
            document.getElementById('user-coins').textContent = coins.balance || 0;
        } catch (error) {
            console.error('Error loading overview:', error);
        }
    }

    static async loadProducts() {
        try {
            const products = await API.getProducts();
            const container = document.getElementById('products-list');

            if (products.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">No products found. Create your first product!</p>';
                return;
            }

            container.innerHTML = products.map(product => `
                <div class="data-card glass">
                    <h3>${product.title}</h3>
                    <p>${product.description || 'No description'}</p>
                    <p><strong>Price:</strong> ₹${product.price}</p>
                    <p><strong>Stock:</strong> ${product.stock}</p>
                    <span class="badge ${product.stock > 0 ? 'success' : 'danger'}">
                        ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                </div>
            `).join('');
        } catch (error) {
            UI.showError('Failed to load products');
        }
    }

    static async loadRooms() {
        try {
            const rooms = await API.getRooms();
            const container = document.getElementById('rooms-list');

            if (rooms.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">No rooms found. Create your first room!</p>';
                return;
            }

            container.innerHTML = rooms.map(room => `
                <div class="data-card glass">
                    <h3>${room.name}</h3>
                    <p><strong>Size:</strong> ${room.size} members</p>
                    <p><strong>Status:</strong> ${room.status}</p>
                    <p><strong>Min Orders:</strong> ${room.unlockMinOrders}</p>
                    <span class="badge ${room.status === 'UNLOCKED' ? 'success' : room.status === 'LOCKED' ? 'warning' : 'danger'}">
                        ${room.status}
                    </span>
                </div>
            `).join('');
        } catch (error) {
            UI.showError('Failed to load rooms');
        }
    }

    static async loadProfile() {
        try {
            const profile = await API.getProfile();
            const coins = await API.getCoins();

            document.getElementById('profile-details').innerHTML = `
                <p><strong>Mobile:</strong> ${profile.mobile}</p>
                <p><strong>Name:</strong> ${profile.name || 'Not set'}</p>
                <p><strong>Email:</strong> ${profile.email || 'Not set'}</p>
                <p><strong>Coins Balance:</strong> ${coins.balance}</p>
                <p><strong>Referral Code:</strong> ${profile.referralCode}</p>
                <p><strong>Member Since:</strong> ${new Date(profile.createdAt).toLocaleDateString()}</p>
            `;
        } catch (error) {
            UI.showError('Failed to load profile');
        }
    }
}

// Product Management
class ProductManager {
    static async createProduct(event) {
        event.preventDefault();

        const data = {
            title: document.getElementById('product-title').value,
            description: document.getElementById('product-description').value,
            price: parseInt(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            categoryId: 'default' // Placeholder
        };

        try {
            await API.createProduct(data);
            UI.hideModal('product-modal');
            UI.showSuccess('Product created successfully!');
            Dashboard.loadProducts();
            Dashboard.loadOverview();
            event.target.reset();
        } catch (error) {
            UI.showError('Failed to create product');
        }
    }
}

// Room Management
class RoomManager {
    static async createRoom(event) {
        event.preventDefault();

        const data = {
            name: document.getElementById('room-name').value,
            size: parseInt(document.getElementById('room-size').value),
            unlockMinOrders: parseInt(document.getElementById('room-min-orders').value),
            unlockMinValue: parseInt(document.getElementById('room-min-value').value),
            offerId: 'default' // Placeholder
        };

        try {
            await API.createRoom(data);
            UI.hideModal('room-modal');
            UI.showSuccess('Room created successfully!');
            Dashboard.loadRooms();
            Dashboard.loadOverview();
            event.target.reset();
        } catch (error) {
            UI.showError('Failed to create room');
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (state.token && state.user) {
        // Verify user has admin role
        if (state.user.role === 'ADMIN' || state.user.role === 'SUPER_ADMIN') {
            UI.showScreen('dashboard-screen');
            Dashboard.init();
        } else {
            // Clear invalid session
            Auth.logout();
        }
    }

    // Login Events
    document.getElementById('send-otp-btn').addEventListener('click', () => Auth.sendOTP());
    document.getElementById('verify-otp-btn').addEventListener('click', () => Auth.verifyOTP());
    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('otp-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });
    document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            UI.showPage(page);

            // Load page data
            if (page === 'products') Dashboard.loadProducts();
            if (page === 'rooms') Dashboard.loadRooms();
            if (page === 'profile') Dashboard.loadProfile();
        });
    });

    // Modal Controls
    document.getElementById('add-product-btn').addEventListener('click', () => {
        UI.showModal('product-modal');
    });

    document.getElementById('create-room-btn').addEventListener('click', () => {
        UI.showModal('room-modal');
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Forms
    document.getElementById('product-form').addEventListener('submit', ProductManager.createProduct);
    document.getElementById('room-form').addEventListener('submit', RoomManager.createRoom);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
});
