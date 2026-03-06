import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);
    
    // Artificial delay for better UX (prevents flickering on fast networks)
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      const [response] = await Promise.all([
        api.post('/auth/login', data),
        minLoadingTime
      ]);
      
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err: any) {
      await minLoadingTime; // Ensure delay even on error
      
      if (err.response) {
        if (err.response.status === 401) {
          setServerError('Invalid username or password.');
        } else if (err.response.status === 403) {
          setServerError('Access denied. Please contact support.');
        } else if (err.response.status === 429) {
          setServerError('Too many attempts. Please try again later.');
        } else if (err.response.status >= 500) {
          setServerError('Server error. Our team has been notified.');
        } else {
          setServerError('An error occurred. Please try again.');
        }
      } else if (err.request) {
        setServerError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setServerError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        <Card className="border shadow-lg sm:rounded-xl overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="pt-6 space-y-4">
              {serverError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive animate-accordion-down">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{serverError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    className={cn(
                      "pl-9 transition-all duration-200 focus:ring-2", 
                      errors.username ? "border-destructive focus:ring-destructive/30" : "focus:ring-primary/30"
                    )}
                    disabled={isLoading}
                    {...register('username')}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive flex items-center gap-1 animate-accordion-down">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      "pl-9 pr-9 transition-all duration-200 focus:ring-2", 
                      errors.password ? "border-destructive focus:ring-destructive/30" : "focus:ring-primary/30"
                    )}
                    disabled={isLoading}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      {showPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1 animate-accordion-down">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4 pb-6">
              <Button 
                type="submit" 
                className="w-full h-10 transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              
              <div className="text-center text-xs text-muted-foreground">
                <span className="opacity-70">Don't have an account? </span>
                <a href="#" className="underline hover:text-primary transition-colors">
                  Contact admin
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center text-xs text-muted-foreground opacity-50">
          &copy; {new Date().getFullYear()} CampaignMgr SaaS. All rights reserved.
        </div>
      </div>
    </div>
  );
}
