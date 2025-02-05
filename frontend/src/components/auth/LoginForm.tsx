import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

const LoginForm = () => {
  const router = useRouter();

  const onSubmit = async (values: z.infer<typeof LoginFormSchema>) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store the access token
      localStorage.setItem('accessToken', data.access_token);
      
      // Optional: Store refresh token if your backend provides one
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      router.push('/');
      router.refresh();

    } catch (error) {
      // Error handling...
    }
  };

  return (
    // Render your form here
  );
};

export default LoginForm; 