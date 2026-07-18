import { LoaderCircle } from "lucide-react";

export default function Loading({ info }) {
    return (
        <div className='flex flex-row w-full h-full justify-center items-center gap-3 text-lg text-muted-foreground'>
            <LoaderCircle className="animate-spin" size={35} color="gray" />
            <p>Loading {info} ...</p>
        </div>
    );
}