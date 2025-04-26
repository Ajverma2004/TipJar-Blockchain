"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

// Main Page Component
const HomePage: React.FC = () => {

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Card className="w-full max-w-lg shadow-xl rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                    <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12 border-2 border-white bg-gradient-to-tr from-pink-400 to-orange-400 rounded-full flex items-center justify-center"> 
                            {/* Colorful Fallback */} 
                            <AvatarFallback className="text-white font-bold text-xl">TJ</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-3xl font-bold">Welcome to TipJar!</CardTitle>
                            <CardDescription className="text-blue-100">Send tips directly on the blockchain.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <p className="text-center text-gray-700 mb-6">
                        Select a staff member and send them a tip in ETH directly using the Sepolia test network.
                    </p>
                    
                    {/* Buttons to navigate */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/payments" passHref>
                            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1"> 
                                Go to Tipping Page
                            </Button>
                        </Link>
                        <Link href="/history" passHref>
                             <Button size="lg" variant="outline" className="w-full sm:w-auto"> 
                                View Transaction History
                            </Button>
                        </Link>
                    </div>
                </CardContent>
                <CardFooter className="bg-gray-50 p-4 text-center">
                     <p className="text-xs text-gray-500">Ensure your wallet is connected to the Sepolia testnet.</p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default HomePage;
