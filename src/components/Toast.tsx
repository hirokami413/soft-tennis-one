import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = 'toast_' + Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 size={16} className="text-green-500 shrink-0" />,
    error: <AlertTriangle size={16} className="text-red-500 shrink-0" />,
    info: <Info size={16} className="text-blue-500 shrink-0" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right-4 fade-in duration-300 ${bgColors[t.type]}`}
          >
            {icons[t.type]}
            <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
