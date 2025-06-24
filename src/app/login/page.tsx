
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Mail, KeyRound, ChromeIcon, Loader2 } from "lucide-react";
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  type User as FirebaseUser,
  createUserWithEmailAndPassword
} from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const redirectedFrom = searchParams.get('redirectedFrom');
  const validRedirect = redirectedFrom && redirectedFrom !== '/login' ? redirectedFrom : '/';


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthChecked(true);
      if (user) {
        // Only redirect if currently on login page or if it's the initial auth check and user is present
        if (router.pathname === '/login' || (!authUser && user)) {
          toast({ title: "Logged In", description: `Redirecting to ${validRedirect}...` });
          router.push(validRedirect);
        }
      }
      // No automatic redirect if user is null, they should stay on login page or be routed by middleware
    });
    return () => unsubscribe();
  }, [router, validRedirect, toast, authUser]); // Added authUser to ensure re-check if it changes externally


  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Sign Up Successful", description: "Redirecting..." });
        // onAuthStateChanged will handle redirect
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Login Successful", description: "Redirecting..." });
        // onAuthStateChanged will handle redirect
      }
    } catch (error: any) {
      console.error("Email/Password Auth Error:", error);
      let errorMessage = "Authentication failed. Please try again.";
      if (error.code === 'auth/email-already-in-use' && isSigningUp) {
        errorMessage = "This email is already registered. Please try logging in.";
      } else if (error.code === 'auth/user-not-found' && !isSigningUp) {
        errorMessage = "User not found. Please check your email or sign up.";
      } else if (error.code === 'auth/wrong-password' && !isSigningUp) {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-credential' && !isSigningUp) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password' && isSigningUp) {
        errorMessage = "Password is too weak. It should be at least 6 characters.";
      } else if (error.code === 'auth/user-disabled'){
        errorMessage = "This user account has been disabled by an administrator."
      }
      toast({ variant: "destructive", title: isSigningUp ? "Sign Up Failed" : "Login Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Google Sign-In Successful", description: "Redirecting..." });
      // onAuthStateChanged will handle redirect
    } catch (error: any) {
      // Log the full error object to the console for more details
      console.error("Google Sign-In Error Object:", error);
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in cancelled.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "An account already exists with this email using a different sign-in method.";
      } else if (error.code) {
        // Use Firebase error code if available and not one of the custom ones
        errorMessage = `Error: ${error.message} (Code: ${error.code})`;
      }
      toast({ variant: "destructive", title: "Google Sign-In Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!authChecked) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Checking authentication...</p>
        </div>
     );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <LogIn className="h-7 w-7"/> {isSigningUp ? "Sign Up for" : "Log In to"} IntelliAssistant
          </CardTitle>
          <CardDescription>
            {isSigningUp ? "Create an account to get started." : "Enter your credentials or use a provider to access."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleEmailPasswordAuth}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email"><Mail className="inline h-4 w-4 mr-1"/> Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password"><KeyRound className="inline h-4 w-4 mr-1"/> Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && !isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading && isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? (isSigningUp ? "Signing Up..." : "Logging In...") : (isSigningUp ? "Sign Up with Email" : "Log In with Email")}
            </Button>
          </CardContent>
        </form>
        <div className="px-6 pb-2 text-center text-sm text-muted-foreground">
            OR
        </div>
        <CardFooter className="flex flex-col gap-3">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChromeIcon className="mr-2 h-4 w-4" />}
            Continue with Google
          </Button>
           <Button variant="link" onClick={() => setIsSigningUp(!isSigningUp)} disabled={isLoading}>
            {isSigningUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
