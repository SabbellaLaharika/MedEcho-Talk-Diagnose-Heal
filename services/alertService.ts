type AlertType = 'success' | 'error' | 'info';
type AlertListener = (message: string, type: AlertType) => void;

let currentListener: AlertListener | null = null;

export const alertService = {
  show: (message: string, type: AlertType = 'error') => {
    if (currentListener) {
      currentListener(message, type);
    } else {
      alert(message);
    }
  },
  success: (message: string) => alertService.show(message, 'success'),
  error: (message: string) => alertService.show(message, 'error'),
  info: (message: string) => alertService.show(message, 'info'),
  subscribe: (listener: AlertListener) => {
    currentListener = listener;
    return () => {
      currentListener = null;
    };
  }
};
