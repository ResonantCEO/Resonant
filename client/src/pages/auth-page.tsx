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
import { Music, Building, Users, Eye, EyeOff } from "lucide-react";
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
        // Show hometown prompt instead of completing login
        setPendingUser(data);
        setShowHometownPrompt(true);
        toast({
          title: "Additional Information Required",
          description: "Please provide your hometown to continue.",
        });
      } else {
        // Complete login normally
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
      // Redirect to home page after successful registration
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex">
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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

      {/* Left Column - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/resonant-logo-login-new.png" alt="Resonant" className="h-20 mx-auto mb-4" />
            <p className="text-gray-600 font-bold">Connect with your community</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
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
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-0"
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
                          const inputValue = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          
                          if (inputValue.length === 8) {
                            // Parse MMDDYYYY format
                            const month = inputValue.substring(0, 2);
                            const day = inputValue.substring(2, 4);
                            const year = inputValue.substring(4, 8);
                            
                            // Validate the date components
                            const monthNum = parseInt(month, 10);
                            const dayNum = parseInt(day, 10);
                            const yearNum = parseInt(year, 10);
                            
                            if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
                              const selectedDate = new Date(yearNum, monthNum - 1, dayNum);
                              // Verify the date is valid (handles leap years, days in month, etc.)
                              if (selectedDate.getFullYear() === yearNum && 
                                  selectedDate.getMonth() === monthNum - 1 && 
                                  selectedDate.getDate() === dayNum) {
                                const isoString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format for backend
                                setRegisterForm(prev => ({ ...prev, birthdate: isoString }));
                                // Update the input to show formatted date
                                e.target.value = selectedDate.toLocaleDateString('en-US');
                                return;
                              }
                            }
                          }
                          
                          // For incomplete input or invalid dates, store the current input
                          if (inputValue.length <= 8) {
                            // Format as user types: MM/DD/YYYY
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
                            setRegisterForm(prev => ({ ...prev, birthdate: '' })); // Clear until valid
                          }
                          
                          // Clear birthdate if input is empty
                          if (!inputValue) {
                            setRegisterForm(prev => ({ ...prev, birthdate: '' }));
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, tab, escape, enter
                          if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                              // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                              (e.keyCode === 65 && e.ctrlKey) ||
                              (e.keyCode === 67 && e.ctrlKey) ||
                              (e.keyCode === 86 && e.ctrlKey) ||
                              (e.keyCode === 88 && e.ctrlKey)) {
                            return;
                          }
                          // Ensure that it is a number and stop the keypress
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
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-0"
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
      </div>

      {/* Right Column - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <h2 className="text-4xl font-bold mb-6">Where Audiences, Artists And Venues Meet</h2>
          <p className="text-xl mb-8 text-blue-100">
            Connect as an audience member, showcase as an artist, or promote as a venue. 
            One account, multiple identities.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Audience Member</h3>
                <p className="text-blue-200 text-sm">Discover music and connect with friends</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Artist Profile</h3>
                <p className="text-blue-200 text-sm">Showcase your music and connect with fans</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Venue Profile</h3>
                <p className="text-blue-200 text-sm">Promote events and connect with artists</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}