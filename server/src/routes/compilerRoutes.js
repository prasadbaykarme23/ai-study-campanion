const express = require('express');
const axios = require('axios');
const router = express.Router();

// Piston API configuration
const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_MAP = {
    python: { language: 'python', version: '3.10.0' },
    javascript: { language: 'javascript', version: '18.15.0' },
    java: { language: 'java', version: '15.0.2' },
    c: { language: 'c', version: '10.2.0' },
    cpp: { language: 'c++', version: '10.2.0' },
};

router.post('/', async (req, res) => {
    const { language, code } = req.body;

    if (!language || !code) {
        return res.status(400).json({ message: 'Language and code are required' });
    }

    const langConfig = LANGUAGE_MAP[language.toLowerCase()];
    if (!langConfig) {
        return res.status(400).json({ message: 'Unsupported language' });
    }

    try {
        const payload = {
            language: langConfig.language,
            version: langConfig.version,
            files: [
                {
                    content: code,
                },
            ],
        };

        const response = await axios.post(PISTON_API_URL, payload);
        res.json(response.data);
    } catch (error) {
        console.error('Error executing code:', error.message);
        res.status(500).json({
            message: 'Failed to execute code',
            error: error.response?.data || error.message,
        });
    }
});

module.exports = router;
