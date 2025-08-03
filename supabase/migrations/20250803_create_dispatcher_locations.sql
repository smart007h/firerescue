-- Create dispatcher_locations table
create table if not exists public.dispatcher_locations (
    id serial primary key,  -- Changed to serial instead of UUID
    dispatcher_id text not null,  -- Keep as text to handle custom IDs like "FS002"
    latitude double precision not null,
    longitude double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    UNIQUE(dispatcher_id)  -- Ensure one location per dispatcher
);

-- Enable Row Level Security
alter table public.dispatcher_locations enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Anyone can view dispatcher locations" on dispatcher_locations;
drop policy if exists "Anyone can insert dispatcher locations" on dispatcher_locations;
drop policy if exists "Anyone can update dispatcher locations" on dispatcher_locations;

-- Create policies
create policy "Anyone can view dispatcher locations"
    on dispatcher_locations for select
    using ( true );

create policy "Anyone can insert dispatcher locations"
    on dispatcher_locations for insert
    with check ( true );

create policy "Anyone can update dispatcher locations"
    on dispatcher_locations for update
    using ( true );

-- Grant necessary permissions
grant all on public.dispatcher_locations to anon, authenticated;
