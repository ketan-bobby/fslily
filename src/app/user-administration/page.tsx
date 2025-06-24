
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UsersCog, Trash2, ShieldCheck, KeyRound, Loader2, Edit2, LogOut } from "lucide-react"; // Removed LogOut as it's in AppLayout
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";
// UserFormDialog and related types/functions are commented out as user creation is via Firebase Auth
// import { UserFormDialog, type UserFormData } from '@/components/user-administration/UserFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from '@/lib/types'; // UserRole is still useful for display
// Database interaction functions are removed as user data comes from Firestore via Firebase Admin SDK (backend)
// import { getUsersFromDB, saveUserToDB, deleteUserFromDB, updateUserActiveStatusInDB } from '@/lib/db';
// import { format } from 'date-fns'; // No longer needed for date formatting on this page
import { auth, firestore } from '@/lib/firebase'; // Import Firebase services
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
// Removed signOut from here as it's handled in AppLayout

// This type would ideally come from your shared types, representing the Firestore user profile structure
interface FirestoreUserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: { seconds: number; nanoseconds: number } | string; // Firestore timestamp or ISO string
  updatedAt?: { seconds: number; nanoseconds: number } | string;
  isActive: boolean;
}


const roleColors: Record<UserRole, string> = {
  Admin: "bg-red-500 hover:bg-red-600 text-primary-foreground",
  Recruiter: "bg-blue-500 hover:bg-blue-600 text-primary-foreground",
  "Hiring Manager": "bg-green-500 hover:bg-green-600 text-primary-foreground",
  Viewer: "bg-gray-500 hover:bg-gray-600 text-primary-foreground",
};

export default function UserAdministrationPage() {
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsersFromFirestore = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(firestore, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      const firestoreUsers: FirestoreUserProfile[] = [];
      querySnapshot.forEach((doc) => {
        firestoreUsers.push({ uid: doc.id, ...doc.data() } as FirestoreUserProfile);
      });
      setUsers(firestoreUsers);
      if (firestoreUsers.length === 0) {
        toast({title: "No Users Found", description: "No user profiles in Firestore. Sign up users to see them here."})
      }
    } catch (error) {
       console.error("Error fetching users from Firestore:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not load user profiles from Firestore." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersFromFirestore();
  }, [fetchUsersFromFirestore]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
     // This action should ideally be done by a Cloud Function callable by an admin
     // to update Firebase Auth user's disabled state AND the Firestore 'isActive' field.
     // Directly updating Firestore from client by an admin is possible with correct rules,
     // but disabling Auth user requires Admin SDK.
    setIsLoading(true);
    try {
        const userDocRef = doc(firestore, "users", userId);
        await updateDoc(userDocRef, { isActive: !currentStatus });
        toast({ title: "User Status Updated (Firestore)", description: `User's 'isActive' status in profile updated. Auth status requires Admin SDK.`});
        fetchUsersFromFirestore(); // Refresh
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not update user status in Firestore."});
        console.error("Error updating user status in Firestore:", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: string, userEmail: string | undefined) => {
    // WARNING: DELETING A USER IS A DESTRUCTIVE ACTION.
    // True user deletion requires Firebase Admin SDK to delete the Auth record
    // and then deleting the Firestore profile. This client-side can only delete Firestore profile.
    // This function should be a Cloud Function callable by an admin.
    setIsLoading(true);
    try {
      // For now, only delete Firestore document
      const userDocRef = doc(firestore, "users", userId);
      await deleteDoc(userDocRef);
      toast({ title: "User Profile Deleted (Firestore)", description: `Profile for ${userEmail || userId} deleted from Firestore. Auth record remains.` });
      fetchUsersFromFirestore(); // Refresh
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete user profile from Firestore." });
      console.error("Error deleting user profile from Firestore:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">User Administration</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions within IntelliAssistant.</p>
          </div>
           <Button onClick={() => {
             toast({title: "User Creation", description: "Users are now created via the Sign Up process on the Login page."})
           }} disabled={isLoading}>
            Invite New User (Info)
          </Button>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>User profiles are sourced from Firestore. Role changes and Auth management require Admin SDK via Cloud Functions (not implemented here).</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role (from Profile)</TableHead>
                        <TableHead>UID</TableHead>
                        <TableHead>Status (Profile)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && users.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading users...</TableCell></TableRow>
                        ) : users.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No user profiles found in Firestore.</TableCell></TableRow>
                        ) : users.map((user) => (
                        <TableRow key={user.uid} className={!user.isActive ? "opacity-60" : ""}>
                            <TableCell className="font-medium">{user.displayName}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell><Badge className={cn(roleColors[user.role || 'Viewer'])}>{user.role || 'Viewer'}</Badge></TableCell>
                            <TableCell className="text-xs">{user.uid}</TableCell>
                            <TableCell>
                                <Switch 
                                    checked={user.isActive} 
                                    onCheckedChange={() => toggleUserStatus(user.uid, user.isActive)}
                                    aria-label={user.isActive ? "Deactivate user profile" : "Activate user profile"}
                                    disabled={isLoading} 
                                />
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({title:"Edit User Profile", description:"Editing user profile fields (e.g., displayName, photoURL) from admin panel is not yet implemented."})} disabled>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isLoading}>
                                        <Trash2 className="h-4 w-4" />
                                         <span className="sr-only">Delete User Profile</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will delete the Firestore profile for "{user.displayName}". The Firebase Auth record will remain. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.uid, user.email)} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Delete Profile
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role-Based Access Control (RBAC) & Admin Actions</CardTitle>
            <CardDescription>
                User roles are set as custom claims in Firebase Auth and mirrored in Firestore profiles.
                Managing these (e.g., promoting a user to 'Admin') requires Firebase Admin SDK, typically via secure Cloud Functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-semibold flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-primary"/>Custom Claims for Roles</h4>
              <p className="text-xs text-muted-foreground">The `createUserProfile` Cloud Function sets a default 'Viewer' role claim. Future admin functions could modify this.</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-semibold flex items-center gap-1"><KeyRound className="h-4 w-4 text-primary"/>Secure Backend Operations</h4>
              <p className="text-xs text-muted-foreground">Actions like changing user roles, disabling/enabling Auth users, or fully deleting users (Auth + Firestore) must be done via backend logic (Admin SDK in Cloud Functions) protected by admin role checks.</p>
            </div>
            {/* Remove the page-specific logout button
            <Button onClick={handleLogout} variant="outline" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4"/>}
              Log Out (Current User)
            </Button>
             <p className="text-xs text-muted-foreground mt-1">This button logs out the currently authenticated user from this browser session.</p>
            */}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
