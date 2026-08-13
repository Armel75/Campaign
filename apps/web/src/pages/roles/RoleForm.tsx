import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { ArrowLeft, Loader2, Save } from "lucide-react";

interface RoleFormValues {
  name: string;

  canViewAllCampaigns: boolean;
  canEditAllCampaigns: boolean;
  canDeleteAllCampaigns: boolean;
  canCreateCampaign: boolean;

  canManageTasks: boolean;
  canAssignTasks: boolean;

  canManageCampaignArticles: boolean;
  canManageAttachments: boolean;

  canManageUsers: boolean;
  canManageRoles: boolean;
  canExportCampaign: boolean;

  canViewDashboard: boolean;
  canViewStrategicDashboard: boolean;
  canViewCampaigns: boolean;
  canViewObjectives: boolean;
  canViewTasks: boolean;
  canViewLeads: boolean;
  canViewExpenses: boolean;
  canViewSettings: boolean;
}

export default function RoleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const { register, handleSubmit, setValue } = useForm<RoleFormValues>({
    defaultValues: {
      name: "",

      canViewAllCampaigns: false,
      canEditAllCampaigns: false,
      canDeleteAllCampaigns: false,
      canCreateCampaign: false,

      canManageTasks: false,
      canAssignTasks: false,

      canManageCampaignArticles: false,
      canManageAttachments: false,

      canManageUsers: false,
      canManageRoles: false,
      canExportCampaign: false,

      canViewDashboard: false,
      canViewStrategicDashboard: false,
      canViewCampaigns: false,
      canViewObjectives: false,
      canViewTasks: false,
      canViewLeads: false,
      canViewExpenses: false,
      canViewSettings: false,
    },
  });

  useEffect(() => {
    if (!isEdit) {
      setInitialLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const res = await api.get(`/roles/${id}`);
        const role = res.data;

        setValue("name", role.name ?? "");

        setValue("canViewAllCampaigns", !!role.canViewAllCampaigns);
        setValue("canEditAllCampaigns", !!role.canEditAllCampaigns);
        setValue("canDeleteAllCampaigns", !!role.canDeleteAllCampaigns);
        setValue("canCreateCampaign", !!role.canCreateCampaign);

        setValue("canManageTasks", !!role.canManageTasks);
        setValue("canAssignTasks", !!role.canAssignTasks);

        setValue("canManageCampaignArticles", !!role.canManageCampaignArticles);
        setValue("canManageAttachments", !!role.canManageAttachments);

        setValue("canManageUsers", !!role.canManageUsers);
        setValue("canManageRoles", !!role.canManageRoles);
        setValue("canExportCampaign", !!role.canExportCampaign);

        setValue("canViewDashboard", !!role.canViewDashboard);
        setValue("canViewStrategicDashboard", !!role.canViewStrategicDashboard);
        setValue("canViewCampaigns", !!role.canViewCampaigns);
        setValue("canViewObjectives", !!role.canViewObjectives);
        setValue("canViewTasks", !!role.canViewTasks);
        setValue("canViewLeads", !!role.canViewLeads);
        setValue("canViewExpenses", !!role.canViewExpenses);
        setValue("canViewSettings", !!role.canViewSettings);
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRole();
  }, [id, isEdit, setValue]);

  const onSubmit = async (data: RoleFormValues) => {
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/roles/${id}`, data);
      } else {
        await api.post("/roles", data);
      }

      navigate("/roles");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/roles")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Role" : "Create Role"}
          </h2>
          <p className="text-muted-foreground">
            Configure the permissions for this role.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
          <CardDescription>
            Update the role name and permissions below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input id="name" {...register("name")} placeholder="ADMIN" />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Campaign permissions</h3>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewAllCampaigns"
                    {...register("canViewAllCampaigns")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewAllCampaigns">
                    Can view all campaigns
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canEditAllCampaigns"
                    {...register("canEditAllCampaigns")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canEditAllCampaigns">
                    Can edit all campaigns
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canDeleteAllCampaigns"
                    {...register("canDeleteAllCampaigns")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canDeleteAllCampaigns">
                    Can delete all campaigns
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canCreateCampaign"
                    {...register("canCreateCampaign")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canCreateCampaign">
                    Can create campaign
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Tasks</h3>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canManageTasks"
                    {...register("canManageTasks")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canManageTasks">Can manage tasks</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canAssignTasks"
                    {...register("canAssignTasks")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canAssignTasks">Can assign tasks</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Campaign content</h3>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canManageCampaignArticles"
                    {...register("canManageCampaignArticles")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canManageCampaignArticles">
                    Can manage campaign articles
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canManageAttachments"
                    {...register("canManageAttachments")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canManageAttachments">
                    Can manage attachments
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Administration</h3>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canManageUsers"
                    {...register("canManageUsers")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canManageUsers">Can manage users</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canManageRoles"
                    {...register("canManageRoles")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canManageRoles">Can manage roles</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canExportCampaign"
                    {...register("canExportCampaign")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canExportCampaign">
                    Can export campaign
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">UI visibility</h3>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewDashboard"
                    {...register("canViewDashboard")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewDashboard">Can view dashboard</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewStrategicDashboard"
                    {...register("canViewStrategicDashboard")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewStrategicDashboard">
                    Can view strategic dashboard
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewCampaigns"
                    {...register("canViewCampaigns")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewCampaigns">Can view campaigns</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewObjectives"
                    {...register("canViewObjectives")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewObjectives">Can view objectives</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewTasks"
                    {...register("canViewTasks")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewTasks">Can view tasks</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewLeads"
                    {...register("canViewLeads")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewLeads">Can view leads</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewExpenses"
                    {...register("canViewExpenses")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewExpenses">Can view expenses</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canViewSettings"
                    {...register("canViewSettings")}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="canViewSettings">Can view settings</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Role
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}