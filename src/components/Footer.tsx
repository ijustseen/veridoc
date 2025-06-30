"use client";
import { Github, Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-background p-4 text-center text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
      <div>© {new Date().getFullYear()} VeriDoc. All rights reserved.</div>
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link
            href="https://github.com/your-repo-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link href="mailto:info@veridoc.com" aria-label="Email">
            <Mail className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          title="LinkedIn of Person 1"
        >
          <Link
            href="https://linkedin.com/in/person1"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Person 1"
          >
            <Linkedin className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          title="LinkedIn of Person 2"
        >
          <Link
            href="https://linkedin.com/in/person2"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Person 2"
          >
            <Linkedin className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          title="LinkedIn of Person 3"
        >
          <Link
            href="https://linkedin.com/in/person3"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Person 3"
          >
            <Linkedin className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </footer>
  );
}
