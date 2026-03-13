import React from 'react';
import '../styles/Modal.css';

const Modal = ({ show, title, children, onClose, contentClassName = '', bodyClassName = '' }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-content ${contentClassName}`.trim()} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
        <button className="modal-close" onClick={onClose}>✖</button>
      </div>
    </div>
  );
};

export default Modal;