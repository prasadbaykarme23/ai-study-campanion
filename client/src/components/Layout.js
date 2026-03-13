import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <Navbar />
            <div className="content-wrapper">
                {children}
            </div>
        </div>
    );
};

export default Layout;
