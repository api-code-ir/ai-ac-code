document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const uploadImageButton = document.getElementById('upload-image-button');
    const imageUploadInput = document.getElementById('image-upload');
    const uploadAudioButton = document.getElementById('upload-audio-button');
    const audioUploadInput = document.getElementById('audio-upload');
    const generateImageButton = document.getElementById('generate-image-button');

    const API_URL = 'https://api2.api-code.ir/gpt-save-v2/';
    // For simplicity, using a fixed userid. In a real app, this should be dynamic or managed.
    const USER_ID = 'jules_chat_user_' + Date.now();

    function appendMessage(text, sender, isLoading = false, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');

        if (isLoading) {
            messageDiv.innerHTML = '<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>';
        } else if (isError) {
            messageDiv.classList.add('error-message');
            messageDiv.textContent = `خطا: ${text}`;
        } else {
            // Basic Markdown for code blocks (```code```)
            // More sophisticated parsing might be needed for full markdown.
            // For now, we'll handle code highlighting later with a library.
            messageDiv.innerHTML = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
        messageDiv.classList.add('new-message-animation');
    }

    async function sendMessage(promptText, imageFile = null, audioFile = null) {
        if (!promptText && !imageFile && !audioFile) return;

        if (promptText) {
            appendMessage(promptText, 'user');
        } else if (imageFile) {
            appendMessage(`[کاربر یک تصویر آپلود کرد: ${imageFile.name}]`, 'user');
        } else if (audioFile) {
            appendMessage(`[کاربر یک فایل صوتی آپلود کرد: ${audioFile.name}]`, 'user');
        }

        const loadingMessage = appendMessage('', 'ai', true); // Show loading indicator

        const formData = new FormData();
        formData.append('userid', USER_ID);

        if (promptText) {
            formData.append('prompt', promptText);
        }
        if (imageFile) {
            formData.append('image_file', imageFile);
            formData.append('model', 'openai'); // Assuming openai for image analysis, can be made selectable
            if (!promptText) formData.append('prompt', 'این تصویر را تحلیل کن');
        }
        if (audioFile) {
            formData.append('audio_file', audioFile);
            formData.append('model', 'openai-audio'); // Assuming openai-audio for audio, can be made selectable
             if (!promptText) formData.append('prompt', 'این فایل صوتی را پردازش کن');
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            // Remove loading indicator
            if (loadingMessage && loadingMessage.parentElement) {
                 loadingMessage.parentElement.removeChild(loadingMessage);
            }

            if (!response.ok) {
                const errorText = await response.text();
                appendMessage(`خطا در ارتباط با API: ${response.status} ${errorText || response.statusText}`, 'ai', false, true);
                return;
            }

            const resultText = await response.text();
            appendMessage(resultText, 'ai');

        } catch (error) {
            if (loadingMessage && loadingMessage.parentElement) {
                 loadingMessage.parentElement.removeChild(loadingMessage);
            }
            console.error('Error:', error);
            appendMessage(`یک مشکل در ارتباط با سرور رخ داد: ${error.message}`, 'ai', false, true);
        }
    }

    async function generateImage(promptText) {
        if (!promptText) {
            alert('لطفا یک توضیح برای تصویر وارد کنید.');
            return;
        }
        appendMessage(`درخواست ساخت تصویر: "${promptText}"`, 'user');
        const loadingMessage = appendMessage('', 'ai', true);

        const params = new URLSearchParams({
            action: 'generate_image',
            prompt: promptText,
            // model: 'dall-e-3', // Or other model if available and preferred
            width: 512, // Default, can be made configurable
            height: 512 // Default, can be made configurable
        });

        try {
            const response = await fetch(`${API_URL}?${params.toString()}`);

            if (loadingMessage && loadingMessage.parentElement) {
                loadingMessage.parentElement.removeChild(loadingMessage);
            }

            if (!response.ok) {
                 const errorText = await response.text();
                appendMessage(`خطا در ساخت تصویر: ${response.status} ${errorText || response.statusText}`, 'ai', false, true);
                return;
            }

            const imageBlob = await response.blob();
            if (imageBlob.type.startsWith('image/')) {
                const imageUrl = URL.createObjectURL(imageBlob);
                appendMessage(`<img src="${imageUrl}" alt="Generated Image: ${promptText}" class="generated-image">`, 'ai');
            } else {
                // If the response is not an image, it might be an error message from the API in text/html or json format
                const errorText = await imageBlob.text();
                console.error("Image generation API did not return an image:", errorText);
                appendMessage(`پاسخ غیرمنتظره از API ساخت تصویر: ${errorText}`, 'ai', false, true);
            }

        } catch (error) {
             if (loadingMessage && loadingMessage.parentElement) {
                loadingMessage.parentElement.removeChild(loadingMessage);
            }
            console.error('Image generation error:', error);
            appendMessage(`خطا در ساخت تصویر: ${error.message}`, 'ai', false, true);
        }
    }


    sendButton.addEventListener('click', () => {
        const text = userInput.value.trim();
        if (text) {
            sendMessage(text);
            userInput.value = '';
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line on Enter
            const text = userInput.value.trim();
            if (text) {
                sendMessage(text);
                userInput.value = '';
            }
        }
    });

    uploadImageButton.addEventListener('click', () => {
        imageUploadInput.click();
    });

    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const userPrompt = prompt("اختیاری: توضیحی برای تصویر وارد کنید:", "");
            sendMessage(userPrompt, file);
        }
        imageUploadInput.value = null; // Reset file input
    });

    uploadAudioButton.addEventListener('click', () => {
        audioUploadInput.click();
    });

    audioUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const userPrompt = prompt("اختیاری: دستوری برای فایل صوتی وارد کنید (مثلا: این صدا را به متن تبدیل کن):", "");
            sendMessage(userPrompt, null, file);
        }
        audioUploadInput.value = null; // Reset file input
    });

    generateImageButton.addEventListener('click', () => {
        const promptText = prompt("توضیحی برای تصویری که می‌خواهید بسازید وارد کنید:");
        if (promptText) {
            generateImage(promptText);
        }
    });

    // Initial greeting or info message (optional)
    appendMessage("سلام! چطور می‌توانم کمکتان کنم؟ می‌توانید متن ارسال کنید، عکس یا صدا آپلود کنید، یا درخواست ساخت عکس بدهید.", 'ai');
});
