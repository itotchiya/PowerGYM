import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Users, BarChart3, Shield, Smartphone, Zap, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LandingPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, userProfile, session } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
            {/* Logged In User Alert */}
            {user && (
                <div className="container mx-auto px-4 pt-6">
                    <Alert className="bg-orange-500/20 border-orange-400/50 backdrop-blur-lg">
                        <Info className="h-5 w-5 text-orange-400" />
                        <AlertDescription className="text-white ml-2 flex items-center justify-between flex-wrap gap-4">
                            <span className="text-lg">
                                You are already logged in!
                            </span>
                            <Button
                                onClick={() => {
                                    if (userProfile?.role === 'superadmin') {
                                        navigate('/superadmin/dashboard');
                                    } else if (session) {
                                        navigate('/dashboard');
                                    } else {
                                        navigate('/select-role');
                                    }
                                }}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                Access Dashboard →
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <Badge variant="outline" className="mb-4 text-white border-white/30">
                        SaaS Gym Management Platform
                    </Badge>
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                        <Dumbbell className="inline-block mr-3 h-14 w-14" />
                        PowerGYM
                    </h1>
                    <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
                        {t('landing.heroSubtitle')}
                    </p>
                    <Button size="lg" onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6">
                        {t('landing.getStarted')} →
                    </Button>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Users className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">{t('landing.memberManagement')}</h3>
                            <p className="text-purple-200">
                                {t('landing.memberManagementDesc')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <BarChart3 className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">{t('landing.paymentTracking')}</h3>
                            <p className="text-purple-200">
                                {t('landing.paymentTrackingDesc')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Shield className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">{t('landing.expiryAlerts')}</h3>
                            <p className="text-purple-200">
                                {t('landing.expiryAlertsDesc')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Smartphone className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">{t('landing.multiRole')}</h3>
                            <p className="text-purple-200">
                                {t('landing.multiRoleDesc')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Zap className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Fast & Efficient</h3>
                            <p className="text-purple-200">
                                Lightning-fast performance with instant updates and seamless user experience.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Dumbbell className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Multi-Gym Support</h3>
                            <p className="text-purple-200">
                                Manage multiple gym locations from a single, centralized platform.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* CTA Section */}
                <div className="text-center mt-16">
                    <Card className="bg-white/5 backdrop-blur-lg border-white/20 max-w-2xl mx-auto">
                        <CardContent className="p-8">
                            <h2 className="text-3xl font-bold text-white mb-4">{t('landing.heroTitle')}</h2>
                            <p className="text-purple-200 mb-6">
                                Join hundreds of gym owners who trust PowerGYM to manage their business.
                            </p>
                            <Button size="lg" onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600 text-white">
                                {t('auth.login')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

