import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Users, BarChart3, Shield, Smartphone, Zap } from "lucide-react";

export function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
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
                        The complete solution for managing your gym. Track members, subscriptions, payments, and grow your business with powerful analytics.
                    </p>
                    <Button size="lg" onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6">
                        Get Started →
                    </Button>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Users className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Member Management</h3>
                            <p className="text-purple-200">
                                Effortlessly manage member profiles, subscriptions, and track their fitness journey.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <BarChart3 className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Analytics & Insights</h3>
                            <p className="text-purple-200">
                                Real-time dashboards and reports to track revenue, member growth, and performance.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Shield className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h3>
                            <p className="text-purple-200">
                                Enterprise-grade security with role-based access control and data encryption.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                        <CardContent className="p-6">
                            <Smartphone className="h-12 w-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Mobile Friendly</h3>
                            <p className="text-purple-200">
                                Access your gym management tools anywhere, anytime from any device.
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
                            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Gym?</h2>
                            <p className="text-purple-200 mb-6">
                                Join hundreds of gym owners who trust PowerGYM to manage their business.
                            </p>
                            <Button size="lg" onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600 text-white">
                                Login to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
