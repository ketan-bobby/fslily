
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Added useRouter
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutGrid,
  ClipboardList,
  Briefcase,
  Users,
  Target,
  UserCog,
  CalendarCheck2,
  Repeat,
  Link2 as LinkIcon,
  BarChart2,
  Handshake,
  Settings,
  ShieldCheck,
  Wrench,
  LifeBuoy,
  HelpCircle,
  BrainCircuit,
  LogOut,
  Moon,
  Sun,
  Menu,
  Sparkles,
  Loader2, 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { auth } from '@/lib/firebase'; 
import { signOut } from 'firebase/auth'; 
import { useToast } from "@/hooks/use-toast"; 
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import Image from "next/image";

interface NavItemConfig {
  href: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  exactMatch?: boolean;
}

interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

const mainNavGroups: NavGroupConfig[] = [
  {
    title: "MAIN",
    items: [
      { href: "/", icon: LayoutGrid, label: "Admin Dashboard", exactMatch: true },
      { href: "/all-projects", icon: ClipboardList, label: "All Projects" },
      { href: "/job-requisitions", icon: Briefcase, label: "Job Management" },
      { href: "/candidate-pipeline", icon: Users, label: "Candidate Bank" },
      { href: "/ideal-candidate", icon: Target, label: "Ideal Candidate" },
      { href: "/resume-screening", icon: Sparkles, label: "Resume Screening" },
      { href: "/manager-profiles", icon: UserCog, label: "Manager Profiles" },
      { href: "/interview-system", icon: CalendarCheck2, label: "Interview System" },
      { href: "/re-engagement", icon: Repeat, label: "Re-engagement" },
      { href: "/interview-links", icon: LinkIcon, label: "Interview Links" },
      { href: "/company-analytics", icon: BarChart2, label: "Company Analytics" },
      { href: "/client-management", icon: Handshake, label: "Client Management" },
      { href: "/user-administration", icon: UserCog, label: "User Administration" },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { href: "/system-settings", icon: Settings, label: "System Settings" },
      { href: "/security-controls", icon: ShieldCheck, label: "Security Controls" },
      { href: "/admin-tools", icon: Wrench, label: "Admin Tools" },
      { href: "/admin-support", icon: LifeBuoy, label: "Admin Support" },
    ],
  },
];

const helpNavItemConfig: NavItemConfig = { href: "/help", icon: HelpCircle, label: "Help" };

const AppLogo = () => {
    const { settings } = useSystemSettings();
    const logoUrl = settings?.logoUrl;
    const orgName = settings?.organizationName || "IntelliAssistant";

    return (
        <Link href="/" className="flex items-center gap-2 px-2">
            {logoUrl ? (
                <Image src={logoUrl} alt={`${orgName} Logo`} width={32} height={32} className="h-8 w-8 object-contain" />
            ) : (
                <BrainCircuit className="h-8 w-8 text-primary" />
            )}
            <h1 className="text-xl font-semibold text-primary font-headline">
                {orgName}
            </h1>
        </Link>
    );
};

const CollapsibleAppLogo = () => {
  const { state } = useSidebar();
  const { settings } = useSystemSettings();
  const logoUrl = settings?.logoUrl;

  if (state === "collapsed") {
    return (
      <Link href="/" className="flex items-center justify-center py-2">
        {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
        ) : (
            <BrainCircuit className="h-8 w-8 text-primary" />
        )}
      </Link>
    );
  }
  return <AppLogo />;
};

const UserProfile = () => {
  const [currentTheme, setCurrentTheme] = React.useState("light");
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login'); 
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message || "Could not log out at this time.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={auth.currentUser?.photoURL || "https://placehold.co/100x100.png"} alt={auth.currentUser?.displayName || "User Avatar"} data-ai-hint="admin avatar"/>
            <AvatarFallback>{auth.currentUser?.displayName?.substring(0,2).toUpperCase() || "SA"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{auth.currentUser?.displayName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {auth.currentUser?.email || "No email"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/system-settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme}>
          {currentTheme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
          <span>Toggle Theme</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { state: sidebarState, toggleSidebar } = useSidebar();

  const findActiveItemLabel = () => {
    for (const group of mainNavGroups) {
      for (const item of group.items) {
        if (item.href === "/" && pathname === "/") return item.label;
        if (item.href !== "/" && (item.exactMatch ? pathname === item.href : pathname.startsWith(item.href))) {
          return item.label;
        }
      }
    }
    if (helpNavItemConfig.exactMatch ? pathname === helpNavItemConfig.href : pathname.startsWith(helpNavItemConfig.href)) {
       if (helpNavItemConfig.href === "/" && pathname !== "/") return undefined;
      return helpNavItemConfig.label;
    }
    return "Admin Dashboard";
  };

  const currentHeaderLabel = findActiveItemLabel();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar collapsible="icon" side="left" className="border-r">
        <SidebarHeader className="p-2 h-16 flex items-center justify-between">
          <CollapsibleAppLogo />
          {sidebarState !== "collapsed" && !isMobile && (
            <SidebarTrigger className="block md:hidden lg:block" />
          )}
        </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
          <ScrollArea className="h-full">
            {mainNavGroups.map((group) => (
              <SidebarGroup key={group.title} className="pt-0 pb-1 px-0">
                {group.title && <SidebarGroupLabel className="px-2 mb-1">{group.title}</SidebarGroupLabel>}
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.exactMatch ? pathname === item.href : (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))}
                        tooltip={sidebarState === 'collapsed' ? item.label : undefined}
                        className="justify-start"
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))}
            <SidebarSeparator className="my-2"/>
             <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={helpNavItemConfig.exactMatch ? pathname === helpNavItemConfig.href : pathname.startsWith(helpNavItemConfig.href)}
                    tooltip={sidebarState === 'collapsed' ? helpNavItemConfig.label : undefined}
                    className="justify-start"
                  >
                    <Link href={helpNavItemConfig.href}>
                      <helpNavItemConfig.icon />
                      <span>{helpNavItemConfig.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        {sidebarState !== 'collapsed' && (
           <SidebarFooter className="p-4 border-t">
            <div className="flex items-center gap-2">
               <Avatar className="h-8 w-8">
                 <AvatarImage src={auth.currentUser?.photoURL || "https://placehold.co/100x100.png"} alt={auth.currentUser?.displayName || "User Avatar"} data-ai-hint="admin avatar small"/>
                 <AvatarFallback>{auth.currentUser?.displayName?.substring(0,2).toUpperCase() || "SA"}</AvatarFallback>
               </Avatar>
               <div className="text-sm">
                 <p className="font-medium">{auth.currentUser?.displayName || "User"}</p>
                 <p className="text-xs text-muted-foreground">{auth.currentUser?.email || "No email"}</p>
               </div>
            </div>
           </SidebarFooter>
        )}
      </Sidebar>
      <SidebarInset className="flex flex-col flex-1 bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
             <Button variant="outline" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
                <Menu className="h-5 w-5" />
             </Button>
             <AppLogo/>
          </div>
          <div className="hidden md:flex text-lg font-semibold">
            {currentHeaderLabel}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <UserProfile />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppLayoutInternal>{children}</AppLayoutInternal>
    </SidebarProvider>
  );
}
