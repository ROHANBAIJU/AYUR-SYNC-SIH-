// This file handles the logic for the login page (index.html)

const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    // If user is already logged in, redirect to the main app
    if (localStorage.getItem('accessToken')) {
        window.location.href = 'analytics.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(e.target.querySelector('button'));
    });
});

async function handleLogin(button) {
    toggleButtonLoading(button, true, 'Logging in...');
    const form = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    loginError.textContent = '';
    
    const details = new URLSearchParams();
    details.append('username', form.username.value);
    details.append('password', form.password.value);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/token`, { method: 'POST', body: details });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Login failed.' }));
            throw new Error(errorData.detail);
        }
        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        window.location.href = 'analytics.html'; // Redirect on success
    } catch (error) {
        loginError.textContent = error.message;
    } finally {
        toggleButtonLoading(button, false, 'Login');
    }
}

function toggleButtonLoading(button, isLoading, loadingText = '') {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    if (!btnText) {
        button.disabled = isLoading;
        return;
    }
    const originalText = btnText.dataset.originalText || btnText.textContent;
    if (!btnText.dataset.originalText) btnText.dataset.originalText = originalText;
    const loader = button.querySelector('.loader');
    button.disabled = isLoading;

    if (isLoading) {
        btnText.textContent = loadingText || originalText;
        if (loader) loader.classList.remove('hidden');
    } else {
        btnText.textContent = originalText;
        if (loader) loader.classList.add('hidden');
    }
}
