import Link from "next/link";
import { Mail, Mailr } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t bg-background text-foreground">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">

                    {/* Column 1: Brand & Bio */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold tracking-tight">ReviewManager</h3>
                        <p className="text-sm text-muted-foreground">
                            Automate and streamline your Google Business Profile review management with smart AI responses.
                        </p>
                        {/* Social Icons */}
                        <div className="flex space-x-4 text-muted-foreground">
                            {/* <Link href="https://twitter.com" className="hover:text-foreground transition-colors" aria-label="Twitter">
                                <Twitter className="h-5 w-5" />
                            </Link>
                            <Link href="https://github.com" className="hover:text-foreground transition-colors" aria-label="GitHub">
                                <Github className="h-5 w-5" />
                            </Link> */}
                        </div>
                    </div>

                    {/* Column 2: Navigation */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                            Product
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/reviews" className="hover:text-foreground transition-colors">
                                    Reviews
                                </Link>
                            </li>
                            <li>
                                <Link href="/settings" className="hover:text-foreground transition-colors">
                                    Settings
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Legal & Support */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                            Legal & Support
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/privacy" className="hover:text-foreground transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-foreground transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            {/* <li>
                                <Link href="/cookies" className="hover:text-foreground transition-colors">
                                    Cookie Policy
                                </Link>
                            </li> */}
                        </ul>
                    </div>

                    {/* Column 4: Contact Info */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                            Contact Us
                        </h4>
                        <ul className="space-y-2.5 text-sm text-muted-foreground">
                            <li className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>support@reviewmanager.com</span>
                            </li>
                            {/* <li className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>+1 (555) 000-0000</span>
                            </li>
                            <li className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span>Apex, NC 27502</span>
                            </li> */}
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar: Copyright */}
                <div className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
                    <p>© {currentYear} ReviewManager. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}