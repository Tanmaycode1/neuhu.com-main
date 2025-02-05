'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

type FieldErrors = {
    email?: string[];
    password?: string[];
    non_field_errors?: string[];
};

export default function LoginPage() {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setIsLoading(true);
        
        try {
            const result = await login(credentials);
            if (result.success) {
                toast.success('Login successful!');
                router.push('/messages');
            } else {
                setErrors(result.errors || {});
                // Show error message based on status
                if (result.status === 404) {
                    toast.error('User not found. Please check your email or sign up.');
                } else if (result.status === 401) {
                    toast.error('Incorrect password. Please try again.');
                    setCredentials(prev => ({ ...prev, password: '' })); // Clear password on incorrect attempt
                } else {
                    toast.error(result.message || 'Login failed');
                }
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
            setErrors({
                non_field_errors: ['An unexpected error occurred. Please try again.']
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                                    errors.email ? 'border-red-500' : 'border-gray-300'
                                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                                placeholder="Email address"
                                value={credentials.email}
                                onChange={(e) => {
                                    setCredentials({ ...credentials, email: e.target.value });
                                    if (errors.email) setErrors({ ...errors, email: undefined });
                                }}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                                    errors.password ? 'border-red-500' : 'border-gray-300'
                                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                                placeholder="Password"
                                value={credentials.password}
                                onChange={(e) => {
                                    setCredentials({ ...credentials, password: e.target.value });
                                    if (errors.password) setErrors({ ...errors, password: undefined });
                                }}
                            />
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>
                            )}
                        </div>
                    </div>

                    {errors.non_field_errors && (
                        <div className="text-sm text-red-600 text-center">
                            {errors.non_field_errors[0]}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 