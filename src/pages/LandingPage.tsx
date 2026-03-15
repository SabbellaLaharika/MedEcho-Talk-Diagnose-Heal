import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck2, Stethoscope, Clock, ShieldCheck } from 'lucide-react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-blue-600 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3376799/pexels-photo-3376799.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Modern hospital building"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 mix-blend-multiply" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Quality Healthcare, <span className="text-blue-200">Simplified</span>
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-blue-100 sm:max-w-3xl">
              Book appointments with top doctors online, manage your healthcare needs,
              and get the care you deserve—all in one place.
            </p>
            <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
              <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                <Button
                  className="w-full flex items-center justify-center px-8 py-3 text-base font-medium rounded-md shadow-sm"
                  size="lg"
                  onClick={() => navigate('/register')}
                >
                  Register
                </Button>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center px-8 py-3 text-base font-medium rounded-md shadow-sm bg-white text-blue-700 hover:bg-blue-50"
                  size="lg"
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why Choose MedEcho?
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Simplified healthcare access with features designed for patients and providers
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8 h-full">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                        <CalendarCheck2 className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Easy Scheduling
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Book appointments with your preferred doctors quickly and easily, without phone calls or waiting.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8 h-full">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-teal-500 rounded-md shadow-lg">
                        <Stethoscope className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Quality Care
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Access to a network of qualified healthcare professionals across various specializations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8 h-full">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <Clock className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Time-Saving
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Reduce waiting time and manage your appointments efficiently with our digital platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8 h-full">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-purple-500 rounded-md shadow-lg">
                        <ShieldCheck className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      Secure & Private
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      Your health information is protected with industry-standard security and privacy measures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-700">
        <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to take control of your healthcare?
            </h2>
            <p className="mt-4 text-lg leading-6 text-blue-100">
              Join thousands of patients who have simplified their healthcare journey.
            </p>
            <Button
              className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 bg-white text-base font-medium text-blue-600 hover:bg-blue-50 sm:w-auto"
              onClick={() => navigate('/register')}
              size="lg"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-base text-gray-400">
              &copy; 2025 MedEcho. All rights reserved.
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Designed for seamless healthcare appointment management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;