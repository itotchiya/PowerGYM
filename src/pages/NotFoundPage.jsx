import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function NotFoundPage() {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-md w-full">
                <CardContent className="p-8 text-center">
                    <AlertCircle className="h-20 w-20 text-orange-400 mx-auto mb-6" />
                    <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                    <h2 className="text-2xl font-semibold text-white mb-3">Page Not Found</h2>
                    <p className="text-purple-200 mb-6">
                        Oops! The page you're looking for doesn't exist or has been moved.
                    </p>
                    <p className="text-purple-300 mb-6">
                        Redirecting to home page in <span className="text-orange-400 font-bold text-xl">{countdown}</span> seconds...
                    </p>
                    <Button
                        size="lg"
                        onClick={() => navigate('/')}
                        className="bg-orange-500 hover:bg-orange-600 text-white w-full"
                    >
                        Go to Home Page Now
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
