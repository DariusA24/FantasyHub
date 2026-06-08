import React from 'react';

type ModalProps = {
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      // onClick={onClose} // enable if you want backdrop click to close
    >
      {/* Stop click events from bubbling to the backdrop */}
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;