import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaUserCircle,
  FaChevronDown,
} from 'react-icons/fa';
import '../styles/Auth.css';
import '../styles/Navbar.css';
import ThemeToggle from './ThemeToggle';
import SiteLogo from './SiteLogo';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();
    const profileRef = useRef();
    const hiddenPaths = ['/login', '/signup'];

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menus on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setProfileOpen(false);
    }, [location.pathname]);

    // close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (hiddenPaths.includes(location.pathname)) {
        return null;
    }

    return (
        <nav className={`navbar fixed-top glass-panel ${scrolled ? 'scrolled' : ''}`}>
            <div className="container flex items-center justify-between">
                <Link to="/" className="navbar-brand flex items-center hover-lift">
                    <SiteLogo />
                </Link>

                <div className="hidden md:flex items-center space-x-6">
                    <Link
                        to="/dashboard"
                        className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/compiler"
                        className={`nav-link ${location.pathname === '/compiler' ? 'active' : ''}`}
                    >
                        Compiler
                    </Link>
                    <ThemeToggle />
                    <div className="relative" ref={profileRef}>
                        <button
                            className="profile-btn flex items-center space-x-1 transition-base"
                            onClick={() => setProfileOpen((o) => !o)}
                        >
                            <FaUserCircle size={24} />
                            <FaChevronDown className={`chevron ${profileOpen ? 'open' : ''}`} />
                        </button>
                        {profileOpen && (
                            <ul className="profile-dropdown glass-panel">
                                <li>
                                    <Link to="/dashboard">Dashboard</Link>
                                </li>
                                <li>
                                    <Link to="/settings">Settings</Link>
                                </li>
                                <li>
                                    <button onClick={() => {/* logout logic */}}>Logout</button>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>

                <button
                    className="mobile-menu-btn md:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="mobile-menu glass-panel">
                    <Link to="/dashboard" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                        Dashboard
                    </Link>
                    <Link to="/compiler" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                        Compiler
                    </Link>
                    <ThemeToggle />
                    <div className="mobile-profile">
                        <button
                            className="profile-btn flex items-center space-x-1 transition-base"
                            onClick={() => setProfileOpen((o) => !o)}
                        >
                            <FaUserCircle size={24} />
                            <FaChevronDown className={`chevron ${profileOpen ? 'open' : ''}`} />
                        </button>
                        {profileOpen && (
                            <ul className="profile-dropdown glass-panel">
                                <li>
                                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
                                </li>
                                <li>
                                    <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)}>Settings</Link>
                                </li>
                                <li>
                                    <button onClick={() => {/* logout logic */}}>Logout</button>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
