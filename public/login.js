document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailOtpForm = document.getElementById('emailOtpForm');
    const phoneOtpForm = document.getElementById('phoneOtpForm');
    const successScreen = document.getElementById('successScreen');
    const dots = document.querySelectorAll('.dot');

    let currentStep = 1;

    // Show toast message
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Update progress dots
    function updateDots(step) {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < step);
        });
    }

    // Toggle password visibility
    document.querySelector('.toggle-password').addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        this.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '👁‍🗨';
    });

    // Handle login form submission
    // Handle login form submission (with backend verification)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

    if (!username || !password || !email.includes('@') || !phone) {
        showToast('Please fill all fields correctly.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Verification code sent to your email');

            // Move to next step
            loginForm.classList.remove('active');
            emailOtpForm.classList.add('active');
            currentStep = 2;
            updateDots(currentStep);
        } else {
            showToast(result.message || 'Login failed');
            alert('Invalid username or password!');
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast('An error occurred. Please try again.');
    }
});


    // Handle OTP inputs
    document.querySelectorAll('.otp-input').forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value) {
                const next = input.nextElementSibling;
                if (next) {
                    next.focus();
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value) {
                const prev = input.previousElementSibling;
                if (prev) {
                    prev.focus();
                }
            }
        });
    });

    // Handle email OTP verification
    emailOtpForm.querySelector('.otp-container').addEventListener('input', () => {
        const inputs = emailOtpForm.querySelectorAll('.otp-input');
        const otp = Array.from(inputs).map(input => input.value).join('');
        
        if (otp.length === 4) {
            showToast('Email verified. Phone verification code sent.');
            emailOtpForm.classList.remove('active');
            phoneOtpForm.classList.add('active');
            currentStep = 3;
            updateDots(currentStep);
        }
    });

    // Handle phone OTP verification
    phoneOtpForm.querySelector('.otp-container').addEventListener('input', () => {
        const inputs = phoneOtpForm.querySelectorAll('.otp-input');
        const otp = Array.from(inputs).map(input => input.value).join('');
        
        if (otp.length === 6) {
            showToast('Verification successful!');
            phoneOtpForm.classList.remove('active');
            successScreen.classList.add('active');
        }
    });

    // Handle back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentForm = btn.closest('.step-form');
            currentForm.classList.remove('active');
            
            if (currentForm === phoneOtpForm) {
                emailOtpForm.classList.add('active');
                currentStep = 2;
            } else if (currentForm === emailOtpForm) {
                loginForm.classList.add('active');
                currentStep = 1;
            }
            
            updateDots(currentStep);
        });
    });

    // Handle continue to account button
    successScreen.querySelector('.submit-btn').addEventListener('click', () => {
        window.location.href = 'voter.html';
    });
});