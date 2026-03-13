import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Landing.css';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [faqOpen, setFaqOpen] = useState(null);

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const handleNewsletterSignup = (e) => {
    e.preventDefault();
    alert(`Thanks for signing up! Check ${email} for updates.`);
    setEmail('');
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">AI Study Companion</span>
          </div>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#testimonials">Testimonials</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-cta">
            {/* use react-router's Link to avoid full page reloads or missing routes */}
            <Link to="/login" className="btn-login">Login</Link>
            <Link to="/signup" className="btn-signup">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">AI Study Companion</h1>
          <p className="hero-subtitle">Your 24/7 Smart Learning Buddy</p>
          <p className="hero-description">
            Ask questions, get personalized notes & summaries, and learn faster with AI-powered study assistance
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary">Try Free</Link>
            <a href="#features" className="btn btn-secondary">Learn More</a>
          </div>
          <div className="hero-image">
            <div className="mockup-box">
              <div className="mockup-chat">
                <div className="chat-bubble bot">What would you like to learn today?</div>
                <div className="chat-bubble user">Explain photosynthesis</div>
                <div className="chat-bubble bot">Photosynthesis is the process...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Powerful Features for Smarter Learning</h2>
          <p className="section-subtitle">Everything you need to master any subject</p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>AI Q&A Tutor</h3>
              <p>Real-time answers to homework and study questions with detailed explanations</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Smart Notes & Summaries</h3>
              <p>Turn PDF and document uploads into organized, comprehensive study notes</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔁</div>
              <h3>Flashcards & Practice</h3>
              <p>Generate interactive quizzes and flashcards for effective review and retention</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Study Tracker</h3>
              <p>Monitor your progress and get detailed analytics on your learning journey</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎧</div>
              <h3>Text-to-Speech</h3>
              <p>Listen to your notes aloud for multi-modal learning and better retention</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Results</h3>
              <p>Get personalized study aids generated in seconds, not hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Get started in 3 simple steps</p>

          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload & Ask</h3>
              <p>Upload your study materials (PDFs, documents) or ask your burning questions</p>
              <div className="step-icon">📤</div>
            </div>

            <div className="step-divider"></div>

            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analyzes</h3>
              <p>Our advanced AI analyzes your content and generates personalized study aids</p>
              <div className="step-icon">🧠</div>
            </div>

            <div className="step-divider"></div>

            <div className="step">
              <div className="step-number">3</div>
              <h3>Learn & Improve</h3>
              <p>Review notes, practice with flashcards, and track your progress</p>
              <div className="step-icon">🚀</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2 className="section-title">What Students Say</h2>
          <p className="section-subtitle">Join thousands of learners transforming their education</p>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">
                "AI Study Companion helped me improve my grades by 30% in just one semester. The personalized notes are incredible!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">SA</div>
                <div className="author-info">
                  <h4>Sarah Anderson</h4>
                  <p>High School Student</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">
                "Finally, a study tool that actually understands what I'm struggling with. The Q&A feature is a game-changer!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">MJ</div>
                <div className="author-info">
                  <h4>Michael Johnson</h4>
                  <p>College Student</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">
                "The flashcard generation is phenomenal. I spend half the time studying but retain twice as much. Absolutely worth it!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">EP</div>
                <div className="author-info">
                  <h4>Emily Patterson</h4>
                  <p>Medical Student</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">
                "The text-to-speech feature is perfect for learning on the go. I can review notes during my commute!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">DK</div>
                <div className="author-info">
                  <h4>David Kumar</h4>
                  <p>Graduate Student</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Get answers to common questions</p>

          <div className="faq-container">
            <div className={`faq-item ${faqOpen === 0 ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(0)}>
                <span>Is AI Study Companion free?</span>
                <span className="faq-icon">{faqOpen === 0 ? '−' : '+'}</span>
              </button>
              <div className="faq-answer">
                Yes! We offer a free tier with 5 uploads and 10 questions per day. Our premium plan unlocks unlimited access, advanced features, and priority support.
              </div>
            </div>

            <div className={`faq-item ${faqOpen === 1 ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(1)}>
                <span>What file types are supported?</span>
                <span className="faq-icon">{faqOpen === 1 ? '−' : '+'}</span>
              </button>
              <div className="faq-answer">
                We support PDF, DOCX, TXT, PPT, and image files (JPG, PNG). You can upload materials up to 50MB in size.
              </div>
            </div>

            <div className={`faq-item ${faqOpen === 2 ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(2)}>
                <span>How does AI generate answers?</span>
                <span className="faq-icon">{faqOpen === 2 ? '−' : '+'}</span>
              </button>
              <div className="faq-answer">
                Our AI uses advanced language models trained on educational content to provide accurate, contextual answers. All responses are cross-referenced for accuracy and include source citations.
              </div>
            </div>

            <div className={`faq-item ${faqOpen === 3 ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(3)}>
                <span>Is my data private and secure?</span>
                <span className="faq-icon">{faqOpen === 3 ? '−' : '+'}</span>
              </button>
              <div className="faq-answer">
                Your data is encrypted and protected with enterprise-grade security. We never share your personal information with third parties. You own all your study materials.
              </div>
            </div>

            <div className={`faq-item ${faqOpen === 4 ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(4)}>
                <span>Can I download my notes and summaries?</span>
                <span className="faq-icon">{faqOpen === 4 ? '−' : '+'}</span>
              </button>
              <div className="faq-answer">
                Absolutely! You can export all your notes, summaries, and flashcards as PDF, DOCX, or CSV files. Perfect for offline studying.
              </div>
            </div>

            <div className={`faq-item ${faqOpen === 5 ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(5)}>
                <span>What devices are supported?</span>
                <span className="faq-icon">{faqOpen === 5 ? '−' : '+'}</span>
              </button>
              <div className="faq-answer">
                Our platform works on all devices: desktop, tablet, and mobile. The responsive design adapts perfectly to any screen size.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Transform Your Learning?</h2>
          <p>Join thousands of students already using AI Study Companion</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn btn-primary btn-large">Start Free Today</Link>
            <a href="mailto:support@aistudycompanion.com" className="btn btn-secondary btn-large">Contact Us</a>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <div className="container">
          <h3>Stay Updated</h3>
          <p>Get tips, updates, and exclusive offers</p>
          <form className="newsletter-form" onSubmit={handleNewsletterSignup}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">Subscribe</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>AI Study Companion</h4>
              <p>Your 24/7 Smart Learning Buddy</p>
              <div className="social-links">
                <a href="https://twitter.com" title="Twitter" target="_blank" rel="noopener noreferrer">𝕏</a>
                <a href="https://facebook.com" title="Facebook" target="_blank" rel="noopener noreferrer">f</a>
                <a href="https://linkedin.com" title="LinkedIn" target="_blank" rel="noopener noreferrer">in</a>
                <a href="https://instagram.com" title="Instagram" target="_blank" rel="noopener noreferrer">📷</a>
              </div>
            </div>

            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><Link to="/pricing">Pricing</Link></li>
                <li><Link to="/blog">Blog</Link></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/careers">Careers</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/press">Press Kit</Link></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/cookies">Cookie Policy</Link></li>
                <li><Link to="/accessibility">Accessibility</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 AI Study Companion. All rights reserved.</p>
            <p>Made with 💙 for students everywhere</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
