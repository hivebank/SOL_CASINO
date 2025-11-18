/**
 * Common UI Utilities and Components
 */

export class UIHelper {
    /**
     * Format currency
     */
    static formatCurrency(amount, decimals = 2) {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Format address (truncate middle)
     */
    static formatAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Show notification
     */
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show loading indicator
     */
    static showLoading(message = 'Loading...') {
        const existing = document.getElementById('loading-overlay');
        if (existing) return;

        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    /**
     * Hide loading indicator
     */
    static hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Create button
     */
    static createButton(text, onClick, className = '') {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `btn ${className}`;
        button.addEventListener('click', onClick);
        return button;
    }

    /**
     * Create input field
     */
    static createInput(type, placeholder, value = '') {
        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.value = value;
        input.className = 'input';
        return input;
    }

    /**
     * Show modal
     */
    static showModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `<h2>${title}</h2>`;

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';

        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.appendChild(content);
        }

        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';

        actions.forEach(action => {
            const btn = this.createButton(action.text, () => {
                if (action.onClick) action.onClick();
                modal.remove();
            }, action.className || '');
            modalFooter.appendChild(btn);
        });

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    /**
     * Confirm dialog
     */
    static confirm(message, onConfirm) {
        return this.showModal('Confirm', message, [
            {
                text: 'Cancel',
                className: 'btn-secondary'
            },
            {
                text: 'Confirm',
                className: 'btn-primary',
                onClick: onConfirm
            }
        ]);
    }

    /**
     * Generate random client seed
     */
    static generateClientSeed() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Animate number change
     */
    static animateNumber(element, start, end, duration = 1000) {
        const startTime = Date.now();
        const diff = end - start;

        const update = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const current = start + (diff * this.easeOutCubic(progress));

            element.textContent = this.formatCurrency(current);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        update();
    }

    /**
     * Easing function
     */
    static easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Copy to clipboard
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
        } catch (err) {
            this.showNotification('Failed to copy', 'error');
        }
    }

    /**
     * Format date
     */
    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    /**
     * Debounce function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

export default UIHelper;
