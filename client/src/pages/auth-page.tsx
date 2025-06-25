
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Music, Building, Users, Eye, EyeOff, Smartphone, Download } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showHometownPrompt, setShowHometownPrompt] = useState(false);
  const [hometownInput, setHometownInput] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    birthdate: "",
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: typeof loginForm) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresHometown) {
        setPendingUser(data);
        setShowHometownPrompt(true);
        toast({
          title: "Additional Information Required",
          description: "Please provide your hometown to continue.",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        setLocation("/");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: typeof registerForm) => {
      const response = await apiRequest("POST", "/api/register", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Welcome to Resonant!",
        description: "Your account has been created successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const hometownMutation = useMutation({
    mutationFn: async (hometown: string) => {
      const response = await apiRequest("POST", "/api/update-hometown", { hometown });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowHometownPrompt(false);
      setPendingUser(null);
      setHometownInput("");
      toast({
        title: "Welcome back!",
        description: "Your hometown has been updated successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update hometown",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email.trim() || !registerForm.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(registerForm);
  };

  const handleHometownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hometownInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter your hometown",
        variant: "destructive",
      });
      return;
    }
    hometownMutation.mutate(hometownInput.trim());
  };

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Background image overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{
          backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDxkZWZzPgogIDxwYXR0ZXJuIGlkPSJjcm93ZCIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgogICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjMzMzIiBvcGFjaXR5PSIwLjMiLz4KICA8L3BhdHRlcm4+CiA8L2RlZnM+CiA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2Nyb3dkKSIvPgo8L3N2Zz4=')`
        }}
      />
      
      {/* Green gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-500 to-green-400" />

      {/* Hometown Prompt Modal */}
      {showHometownPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
            <p className="text-gray-600 mb-4">
              Hi {pendingUser?.firstName || 'there'}! We need your hometown to personalize your experience.
            </p>
            <form onSubmit={handleHometownSubmit} className="space-y-4">
              <div>
                <Label htmlFor="hometown-input">Hometown</Label>
                <Input
                  id="hometown-input"
                  type="text"
                  value={hometownInput}
                  onChange={(e) => setHometownInput(e.target.value)}
                  placeholder="Enter your hometown (e.g., Denver, CO)"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  disabled={hometownMutation.isPending}
                >
                  {hometownMutation.isPending ? "Updating..." : "Continue"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowHometownPrompt(false);
                    setPendingUser(null);
                    setHometownInput("");
                  }}
                  disabled={hometownMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen">
        {/* Left Column - Hero Content */}
        <div className="w-full lg:w-3/5 flex flex-col justify-center p-8 lg:p-16 text-white">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <img src="/resonant-logo-white.png" alt="Resonant" className="h-8" />
              <div className="hidden lg:flex items-center space-x-4 text-sm">
                <span className="text-gray-300">App</span>
                <span className="text-gray-300">Company</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-white text-white hover:bg-white hover:text-gray-900"
                  onClick={() => document.getElementById('auth-tabs')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>

          {/* Main Headline */}
          <div className="mb-8">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              WHERE ARTISTS, VENUES,
              <br />
              <span className="text-green-400">AND FANS MEET</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-300 mb-8 max-w-2xl">
              Sign up for early access to Resonant, the platform that 
              connects audiences, artists, and venues like never before.
              Be part of the change in entertainment—join our waitlist today!
            </p>
          </div>

          {/* Quick Signup Form */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 max-w-md">
              <Input
                type="email"
                placeholder="Email Address"
                className="bg-white text-gray-900 border-white"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
              />
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white px-8 whitespace-nowrap"
                onClick={() => document.getElementById('auth-tabs')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Sign Up
              </Button>
            </div>
          </div>

          {/* App Store Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 flex items-center gap-2">
              <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                <span className="text-black text-xs font-bold">A</span>
              </div>
              Get it on the App Store
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Get it on Google Play
            </Button>
          </div>

          {/* Features */}
          <div className="space-y-4 max-w-md">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Audience Member</h3>
                <p className="text-gray-300 text-sm">Discover music and connect with friends</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Artist Profile</h3>
                <p className="text-gray-300 text-sm">Showcase your music and connect with fans</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Venue Profile</h3>
                <p className="text-gray-300 text-sm">Promote events and connect with artists</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Auth Forms & Phone Mockup */}
        <div className="hidden lg:flex lg:w-2/5 items-center justify-end p-8 relative">
          {/* Auth Form - positioned on the left side of right column */}
          <div className="w-full max-w-sm z-20 mr-8">
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <img src="/resonant-logo-login-new.png" alt="Resonant" className="h-16 mx-auto mb-4" />
                  <p className="text-gray-600">Connect with your community</p>
                </div>

                <Tabs defaultValue="login" className="w-full" id="auth-tabs">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter your password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            value={registerForm.firstName}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            value={registerForm.lastName}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="birthdate">Date of Birth</Label>
                        <Input
                          id="birthdate"
                          type="text"
                          value={registerForm.birthdate}
                          onChange={(e) => {
                            const inputValue = e.target.value.replace(/\D/g, '');
                            
                            if (inputValue.length === 8) {
                              const month = inputValue.substring(0, 2);
                              const day = inputValue.substring(2, 4);
                              const year = inputValue.substring(4, 8);
                              
                              const monthNum = parseInt(month, 10);
                              const dayNum = parseInt(day, 10);
                              const yearNum = parseInt(year, 10);
                              
                              if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
                                const selectedDate = new Date(yearNum, monthNum - 1, dayNum);
                                if (selectedDate.getFullYear() === yearNum && 
                                    selectedDate.getMonth() === monthNum - 1 && 
                                    selectedDate.getDate() === dayNum) {
                                  const isoString = selectedDate.toISOString().split('T')[0];
                                  setRegisterForm(prev => ({ ...prev, birthdate: isoString }));
                                  e.target.value = selectedDate.toLocaleDateString('en-US');
                                  return;
                                }
                              }
                            }
                            
                            if (inputValue.length <= 8) {
                              let formatted = inputValue;
                              if (inputValue.length >= 2) {
                                formatted = inputValue.substring(0, 2);
                                if (inputValue.length >= 4) {
                                  formatted += '/' + inputValue.substring(2, 4);
                                  if (inputValue.length > 4) {
                                    formatted += '/' + inputValue.substring(4, 8);
                                  }
                                }
                              }
                              e.target.value = formatted;
                              setRegisterForm(prev => ({ ...prev, birthdate: '' }));
                            }
                            
                            if (!inputValue) {
                              setRegisterForm(prev => ({ ...prev, birthdate: '' }));
                            }
                          }}
                          onKeyDown={(e) => {
                            if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                                (e.keyCode === 65 && e.ctrlKey) ||
                                (e.keyCode === 67 && e.ctrlKey) ||
                                (e.keyCode === 86 && e.ctrlKey) ||
                                (e.keyCode === 88 && e.ctrlKey)) {
                              return;
                            }
                            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="Type: 04261991 for 04/26/1991"
                          maxLength={10}
                        />
                      </div>

                      <div>
                        <Label htmlFor="register-email">Email *</Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? "text" : "password"}
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Create a password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Phone Mockup - positioned on the far right */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="relative">
              {/* Main phone */}
              <div className="w-48 h-96 bg-green-500 rounded-3xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-3 bg-black rounded-2xl flex items-center justify-center">
                  <div className="text-green-400 text-4xl font-bold">R</div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 border-3 border-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Secondary phone */}
              <div className="absolute -left-12 top-6 w-36 h-72 bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-3 space-y-2">
                  <div className="h-1.5 bg-green-400 rounded"></div>
                  <div className="h-16 bg-gray-700 rounded"></div>
                  <div className="h-6 bg-green-500 rounded"></div>
                  <div className="h-6 bg-gray-600 rounded"></div>
                  <div className="space-y-1">
                    <div className="h-8 bg-gray-700 rounded"></div>
                    <div className="h-8 bg-gray-700 rounded"></div>
                    <div className="h-8 bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Auth Form */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Join Now</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    required
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Password"
                    required
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    required
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Password"
                    required
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating..." : "Join Now"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
