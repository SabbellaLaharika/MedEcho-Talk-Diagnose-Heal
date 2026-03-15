import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useData();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'patient',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const roleOptions = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'staff', label: 'Staff' },
    { value: 'admin', label: 'Admin' }
  ];
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is being edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role as 'patient' | 'admin' | 'doctor' | 'staff'
      };
      
      const newUser = await register(userData);
      
      if (newUser) {
        navigate('/login', { state: { message: 'Registration successful! Please login with your credentials.' } });
      } else {
        setGeneralError('This email is already registered. Please use a different email.');
      }
    } catch (err) {
      setGeneralError('An error occurred during registration. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
      </CardHeader>
      <CardContent>
        {generalError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {generalError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              id="name"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              fullWidth
              required
            />
            <Input
              label="Email"
              type="email"
              id="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              fullWidth
              required
            />
            <Input
              label="Phone Number"
              type="tel"
              id="phone"
              name="phone"
              placeholder="(123) 456-7890"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
            />
            <Select
              label="Role"
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={roleOptions}
              error={errors.role}
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
              error={errors.password}
              fullWidth
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              fullWidth
              required
            />
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Register
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:underline"
          >
            Login
          </button>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterForm;