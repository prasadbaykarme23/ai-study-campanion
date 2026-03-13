/**
 * Landing Page Configuration
 * Customize all landing page content from this single file
 */

export const landingConfig = {
  // Branding
  branding: {
    name: 'AI Study Companion',
    tagline: 'Your 24/7 Smart Learning Buddy',
    logo: '🎓',
    description: 'Ask questions, get personalized notes & summaries, and learn faster with AI-powered study assistance'
  },

  // Navigation Links
  navigation: {
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Testimonials', href: '#testimonials' },
      { label: 'FAQ', href: '#faq' }
    ],
    auth: {
      login: '/login',
      signup: '/signup'
    }
  },

  // Hero Section
  hero: {
    title: 'AI Study Companion',
    subtitle: 'Your 24/7 Smart Learning Buddy',
    description: 'Ask questions, get personalized notes & summaries, and learn faster with AI-powered study assistance',
    cta: [
      { label: 'Try Free', href: '/signup', type: 'primary' },
      { label: 'Learn More', href: '#features', type: 'secondary' }
    ]
  },

  // Features Section
  features: [
    {
      icon: '💬',
      title: 'AI Q&A Tutor',
      description: 'Real-time answers to homework and study questions with detailed explanations'
    },
    {
      icon: '📄',
      title: 'Smart Notes & Summaries',
      description: 'Turn PDF and document uploads into organized, comprehensive study notes'
    },
    {
      icon: '🔁',
      title: 'Flashcards & Practice',
      description: 'Generate interactive quizzes and flashcards for effective review and retention'
    },
    {
      icon: '📊',
      title: 'Study Tracker',
      description: 'Monitor your progress and get detailed analytics on your learning journey'
    },
    {
      icon: '🎧',
      title: 'Text-to-Speech',
      description: 'Listen to your notes aloud for multi-modal learning and better retention'
    },
    {
      icon: '⚡',
      title: 'Instant Results',
      description: 'Get personalized study aids generated in seconds, not hours'
    }
  ],

  // How It Works Section
  howItWorks: [
    {
      number: 1,
      title: 'Upload & Ask',
      description: 'Upload your study materials (PDFs, documents) or ask your burning questions',
      icon: '📤'
    },
    {
      number: 2,
      title: 'AI Analyzes',
      description: 'Our advanced AI analyzes your content and generates personalized study aids',
      icon: '🧠'
    },
    {
      number: 3,
      title: 'Learn & Improve',
      description: 'Review notes, practice with flashcards, and track your progress',
      icon: '🚀'
    }
  ],

  // Testimonials Section
  testimonials: [
    {
      rating: 5,
      quote: 'AI Study Companion helped me improve my grades by 30% in just one semester. The personalized notes are incredible!',
      author: 'Sarah Anderson',
      role: 'High School Student',
      initials: 'SA'
    },
    {
      rating: 5,
      quote: 'Finally, a study tool that actually understands what I\'m struggling with. The Q&A feature is a game-changer!',
      author: 'Michael Johnson',
      role: 'College Student',
      initials: 'MJ'
    },
    {
      rating: 5,
      quote: 'The flashcard generation is phenomenal. I spend half the time studying but retain twice as much. Absolutely worth it!',
      author: 'Emily Patterson',
      role: 'Medical Student',
      initials: 'EP'
    },
    {
      rating: 5,
      quote: 'The text-to-speech feature is perfect for learning on the go. I can review notes during my commute!',
      author: 'David Kumar',
      role: 'Graduate Student',
      initials: 'DK'
    }
  ],

  // FAQ Section
  faq: [
    {
      question: 'Is AI Study Companion free?',
      answer: 'Yes! We offer a free tier with 5 uploads and 10 questions per day. Our premium plan unlocks unlimited access, advanced features, and priority support.'
    },
    {
      question: 'What file types are supported?',
      answer: 'We support PDF, DOCX, TXT, PPT, and image files (JPG, PNG). You can upload materials up to 50MB in size.'
    },
    {
      question: 'How does AI generate answers?',
      answer: 'Our AI uses advanced language models trained on educational content to provide accurate, contextual answers. All responses are cross-referenced for accuracy and include source citations.'
    },
    {
      question: 'Is my data private and secure?',
      answer: 'Your data is encrypted and protected with enterprise-grade security. We never share your personal information with third parties. You own all your study materials.'
    },
    {
      question: 'Can I download my notes and summaries?',
      answer: 'Absolutely! You can export all your notes, summaries, and flashcards as PDF, DOCX, or CSV files. Perfect for offline studying.'
    },
    {
      question: 'What devices are supported?',
      answer: 'Our platform works on all devices: desktop, tablet, and mobile. The responsive design adapts perfectly to any screen size.'
    }
  ],

  // CTA Section
  cta: {
    title: 'Ready to Transform Your Learning?',
    subtitle: 'Join thousands of students already using AI Study Companion',
    buttons: [
      { label: 'Start Free Today', href: '/signup', type: 'primary' },
      { label: 'Contact Us', href: 'mailto:support@aistudycompanion.com', type: 'secondary' }
    ]
  },

  // Newsletter Section
  newsletter: {
    title: 'Stay Updated',
    subtitle: 'Get tips, updates, and exclusive offers',
    placeholder: 'Enter your email'
  },

  // Footer
  footer: {
    company: {
      name: 'AI Study Companion',
      tagline: 'Your 24/7 Smart Learning Buddy',
      social: [
        { platform: 'Twitter', href: 'https://twitter.com', symbol: '𝕏' },
        { platform: 'Facebook', href: 'https://facebook.com', symbol: 'f' },
        { platform: 'LinkedIn', href: 'https://linkedin.com', symbol: 'in' },
        { platform: 'Instagram', href: 'https://instagram.com', symbol: '📷' }
      ]
    },
    sections: {
      product: {
        title: 'Product',
        links: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Blog', href: '/blog' },
          { label: 'FAQ', href: '#faq' }
        ]
      },
      company: {
        title: 'Company',
        links: [
          { label: 'About Us', href: '/about' },
          { label: 'Careers', href: '/careers' },
          { label: 'Contact', href: '/contact' },
          { label: 'Press Kit', href: '/press' }
        ]
      },
      legal: {
        title: 'Legal',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Cookie Policy', href: '/cookies' },
          { label: 'Accessibility', href: '/accessibility' }
        ]
      }
    },
    copyright: '© 2024 AI Study Companion. All rights reserved.',
    made: 'Made with 💙 for students everywhere'
  },

  // SEO
  seo: {
    title: 'AI Study Companion – Smart Learning with AI',
    description: 'An AI-powered study assistant that helps you learn faster with Q&A help, smart notes, flashcards & progress tracking.',
    keywords: ['AI Study', 'Learning Assistant', 'Study Helper', 'Educational AI', 'Flashcards', 'Study Notes', 'Quiz Generator'],
    url: 'https://www.aistudycompanion.com',
    author: 'AI Study Companion',
    image: 'https://www.aistudycompanion.com/og-image.png'
  },

  // Colors (CSS Variables)
  colors: {
    primary: '#5e72e4',
    secondary: '#11cdef',
    accent: '#2dce89',
    dark: '#1a1e2e',
    light: '#f7fafc',
    textDark: '#2d3748',
    textLight: '#718096'
  }
};

export default landingConfig;
