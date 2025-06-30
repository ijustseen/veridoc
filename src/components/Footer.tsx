"use client";
import { Github, Mail, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function Footer() {
  return (
    <footer className="w-full bg-background p-4 text-center text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
      <div>© {new Date().getFullYear()} VeriDoc. All rights reserved.</div>
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link
            href="https://github.com/ijustseen/veridoc"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-5 w-5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <Link href="mailto:info@veridoc.com" aria-label="Email">
            <Mail className="h-5 w-5" />
          </Link>
        </Button>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button asChild variant="ghost" size="icon">
              <Link
                href="https://linkedin.com/in/ruslan-khairullin-3a47282a8"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p className="text-sm">Ruslan Khairulin</p>
          </HoverCardContent>
        </HoverCard>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button asChild variant="ghost" size="icon">
              <Link
                href="https://linkedin.com/in/ruslan-khairullin-3a47282a8"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p className="text-sm">Nikita Vorogušin</p>
          </HoverCardContent>
        </HoverCard>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button asChild variant="ghost" size="icon">
              <Link
                href="https://linkedin.com/in/andrew-eroshenkov"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p className="text-sm">Andrej Jerošenkov</p>
          </HoverCardContent>
        </HoverCard>
      </div>
    </footer>
  );
}
