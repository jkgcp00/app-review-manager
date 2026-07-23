"use client";

import Loading from "@/components/loading";
import { Suspense } from "react";
import LoginPageInternal from "./loginPageInternal";

const LoginPage = () => {
    return (
        <div className="container mx-auto p-6">
            <Suspense fallback={<Loading info={'Loading'}/>}>
                <LoginPageInternal />
            </Suspense>
        </div>
    )
}

export default LoginPage;