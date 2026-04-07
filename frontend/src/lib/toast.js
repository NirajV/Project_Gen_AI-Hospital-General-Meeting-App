// Toast notification utilities using sonner
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const showToast = {
  success: (message, description) => {
    toast.success(message, {
      description,
      icon: <CheckCircle className="h-4 w-4" />,
      duration: 3000,
    });
  },

  error: (message, description) => {
    toast.error(message, {
      description,
      icon: <AlertCircle className="h-4 w-4" />,
      duration: 4000,
    });
  },

  info: (message, description) => {
    toast.info(message, {
      description,
      icon: <Info className="h-4 w-4" />,
      duration: 3000,
    });
  },

  warning: (message, description) => {
    toast.warning(message, {
      description,
      icon: <AlertTriangle className="h-4 w-4" />,
      duration: 3000,
    });
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Error occurred',
    });
  },
};

export default showToast;
