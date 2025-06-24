
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Target, Percent, TrendingUp, TrendingDown, Filter as FilterIconLucide } from "lucide-react";
import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Assuming you might create this
import type { DateRange } from "react-day-picker";


const timeToHireData = [
  { month: "Jan", days: 35 }, { month: "Feb", days: 32 }, { month: "Mar", days: 40 },
  { month: "Apr", days: 38 }, { month: "May", days: 33 }, { month: "Jun", days: 30 },
];
const chartConfigTimeToHire: ChartConfig = {
  days: { label: "Avg. Days to Hire", color: "hsl(var(--primary))" },
};

const sourceEffectivenessData = [
  { source: "LinkedIn", hires: 15, color: "hsl(var(--chart-1))" },
  { source: "Referrals", hires: 25, color: "hsl(var(--chart-2))" },
  { source: "Job Boards", hires: 10, color: "hsl(var(--chart-3))" },
  { source: "Career Site", hires: 20, color: "hsl(var(--chart-4))" },
  { source: "Other", hires: 5, color: "hsl(var(--chart-5))" },
];

const diversityData = [
 { name: 'Group A', value: 40, color: "hsl(var(--chart-1))" },
 { name: 'Group B', value: 30, color: "hsl(var(--chart-2))" },
 { name: 'Group C', value: 20, color: "hsl(var(--chart-3))" },
 { name: 'Group D', value: 10, color: "hsl(var(--chart-4))" },
];


export default function CompanyAnalyticsPage() {
  const [timeframe, setTimeframe] = useState("last_6_months");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>();
  const { toast } = useToast();

  const handleApplyFilters = () => {
    toast({
      title: "Filters Applied (Simulated)",
      description: `Department: ${departmentFilter || "All"}, Date Range: ${dateRangeFilter?.from ? format(dateRangeFilter.from, "LLL dd, y") : "N/A"} - ${dateRangeFilter?.to ? format(dateRangeFilter.to, "LLL dd, y") : "N/A"}. Actual data filtering not implemented.`,
    });
    setShowFilterDialog(false);
  };


  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Company Analytics</h1>
                <p className="text-muted-foreground">Track key recruitment metrics and hiring performance.</p>
            </div>
            <div className="flex gap-2 items-center">
                 <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                        <SelectItem value="last_year">Last Year</SelectItem>
                    </SelectContent>
                </Select>
                <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><FilterIconLucide className="mr-2 h-4 w-4" /> More Filters</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Advanced Filters</DialogTitle>
                      <DialogDescription>
                        Refine your analytics view. These filters are for UI demonstration; actual data filtering is not yet implemented.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="departmentFilter" className="text-right">
                          Department
                        </Label>
                        <Input
                          id="departmentFilter"
                          value={departmentFilter}
                          onChange={(e) => setDepartmentFilter(e.target.value)}
                          className="col-span-3"
                          placeholder="e.g., Engineering"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right col-span-1">Date Range</Label>
                        {/* Replace with your actual DateRangePicker component if you have one */}
                         <Input type="text" placeholder="Date Range Picker Placeholder" className="col-span-3" disabled/>
                         {/* Example: <DatePickerWithRange date={dateRangeFilter} onDateChange={setDateRangeFilter} className="col-span-3"/> */}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowFilterDialog(false)}>Cancel</Button>
                      <Button type="button" onClick={handleApplyFilters}>Apply Filters</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time to Hire</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">34 Days</div>
              <p className="text-xs text-muted-foreground"><TrendingUp className="h-3 w-3 inline text-green-500"/> +2% from last period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offer Acceptance Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground"><TrendingDown className="h-3 w-3 inline text-red-500"/> -5% from last period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Per Hire</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$4,500</div>
              <p className="text-xs text-muted-foreground">Stable compared to last period</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Time to Hire Trend</CardTitle>
                    <CardDescription>Average days to fill a position over time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfigTimeToHire} className="h-[250px] w-full">
                    <BarChart data={timeToHireData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                        <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="days" fill="var(--color-days)" radius={8} />
                    </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
             <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Source Effectiveness</CardTitle>
                    <CardDescription>Number of hires from different recruitment sources.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <ChartContainer config={{}} className="h-[250px] w-full max-w-[300px]">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent nameKey="hires" hideLabel />} />
                            <Pie data={sourceEffectivenessData} dataKey="hires" nameKey="source" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                {sourceEffectivenessData.map((entry) => (
                                <Cell key={`cell-${entry.source}`} fill={entry.color} />
                                ))}
                            </Pie>
                            {/* <Legend /> Uncomment if labels are too cluttered */}
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
        
        {/* Placeholder for Diversity Analytics */}
        <Card>
            <CardHeader>
                <CardTitle>Diversity Analytics</CardTitle>
                <CardDescription>Visualizing diversity metrics across the hiring pipeline.</CardDescription>
            </CardHeader>
             <CardContent className="flex justify-center items-center h-[250px] bg-muted/30 rounded-md">
                 <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                         <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={diversityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {diversityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

// Helper function for date formatting (if not already available globally)
// import { format as formatDate } from 'date-fns';
// const format = (date: Date, formatStr: string) => formatDate(date, formatStr);
// Commented out as it's imported elsewhere or part of standard Date methods for this example.
