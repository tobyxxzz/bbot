import { LayoutDashboard, GraduationCap, Ticket, BookOpen, Settings, Bot, CheckSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Treinamento",
    url: "/training",
    icon: GraduationCap,
  },
  {
    title: "Tickets",
    url: "/tickets",
    icon: Ticket,
  },
  {
    title: "Aprovações",
    url: "/approvals",
    icon: CheckSquare,
  },
  {
    title: "Base de Conhecimento",
    url: "/knowledge",
    icon: BookOpen,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  
  const { data: botStatus } = useQuery<{
    ready: boolean;
    username: string | null;
    serverCount: number;
  }>({
    queryKey: ['/api/bot/status'],
    refetchInterval: 5000,
  });

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">AI Ticket Bot</span>
            <span className="text-xs text-muted-foreground">
              {botStatus?.ready ? (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Offline
                </span>
              )}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
