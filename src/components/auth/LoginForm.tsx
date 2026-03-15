import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useData();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      
      if (user) {
        // Redirect based on user role
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'patient') {
          navigate('/patient');
        } else if (user.role === 'doctor') {
          navigate('/doctor');
        } else if (user.role === 'staff') {
          navigate('/staff');
        }
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Login to Your Account</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              id="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
            />
            <Input
              label="Password"
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              required
            />
            <Button
              type="submit"
              isLoading={isLoading}
              fullWidth
              className="w-full"
            >
              Login
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-blue-600 hover:underline"
          >
            Register
          </button>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;