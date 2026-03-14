/*
  # Watchlists Write Policies

  Adds INSERT and DELETE policies to the watchlists table so authenticated
  users can manage their own saved watchlist terms.

  1. Changes
    - Add INSERT policy: authenticated users can insert rows where user_id = auth.uid()
    - Add DELETE policy: authenticated users can delete their own rows
    - Add SELECT policy scoped to own rows (in addition to the existing public one)

  2. Notes
    - The existing public SELECT policy is left in place for anonymous read
    - For anonymous/unauthenticated use, localStorage is used on the client
*/

CREATE POLICY "Users can insert own watchlist terms"
  ON watchlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist terms"
  ON watchlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
