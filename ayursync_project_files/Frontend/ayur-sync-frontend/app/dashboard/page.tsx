"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search, User, CalendarDays } from "lucide-react";

// Dummy data
const patientData = [
  { name: "Mon", patients: 5 },
  { name: "Tue", patients: 8 },
  { name: "Wed", patients: 4 },
  { name: "Thu", patients: 7 },
  { name: "Fri", patients: 9 },
];

const visitsData = [
  { time: "10:00", visits: 3 },
  { time: "11:00", visits: 6 },
  { time: "12:00", visits: 4 },
  { time: "13:00", visits: 8 },
  { time: "14:00", visits: 5 },
];

const patientList = [
  { name: "Taigo Wikinson", time: "10:00 AM", status: "Emergency" },
  { name: "Samantha Williams", time: "11:30 AM", status: "Follow-up" },
  { name: "Amy White", time: "1:00 PM", status: "Consultation" },
  { name: "Tyler Young", time: "2:30 PM", status: "Review" },
];

export default function DashboardPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="flex min-h-screen bg-[#fefcf6]">
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col p-4">
        <h1 className="text-2xl font-bold mb-6">intelly</h1>
        <nav className="space-y-3">
          <Button variant="ghost" className="justify-start text-white">Dashboard</Button>
          <Button variant="ghost" className="justify-start text-white">Schedule</Button>
          <Button variant="ghost" className="justify-start text-white">Patients</Button>
          <Button variant="ghost" className="justify-start text-white">Reports</Button>
        </nav>
        <div className="mt-auto">
          <Button variant="ghost" className="justify-start text-white">Log out</Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Good morning, Dr. Olivia</h2>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            <input placeholder="Search..." className="border rounded px-2 py-1" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-yellow-200">
            <CardHeader><CardTitle>Patients</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={patientData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="patients" fill="#facc15" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-pink-200">
            <CardHeader><CardTitle>Visits Summary</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={visitsData}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="visits" stroke="#ec4899" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-green-200">
            <CardHeader><CardTitle>By Condition</CardTitle></CardHeader>
            <CardContent>
              <p>5 pers • 3 pers • 2 pers</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-200">
            <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
            <CardContent>
              <p>05:35 • 02:26 • 01:26</p>
            </CardContent>
          </Card>
        </div>

        {/* Patient List */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Patient List</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {patientList.map((p, i) => (
                  <li key={i} className="flex justify-between items-center border-b pb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      <span>{p.name}</span>
                    </div>
                    <span className="text-sm">{p.time}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-pink-100">
            <CardHeader><CardTitle>Visit Details</CardTitle></CardHeader>
            <CardContent>
              <p><b>Patient:</b> Taigo Wilkinson</p>
              <p><b>Visit Time:</b> 10:00 AM</p>
              <p><b>Status:</b> Emergency</p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Right Calendar */}
      <aside className="w-80 border-l p-6">
        <h3 className="font-semibold mb-4">Calendar</h3>
        <Calendar mode="single" selected={date} onSelect={setDate} />
        <div className="mt-6">
          <Button className="w-full">Add Event</Button>
        </div>
        <div className="mt-6">
          <h4 className="font-semibold">Today’s Timeline</h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li>10:00 - Emergency Visit</li>
            <li>11:30 - Diagnostics</li>
            <li>01:00 - Team Planning</li>
            <li>02:30 - Review</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
