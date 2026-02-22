'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { matchFavoritesWithFacilities, type FavoriteFacility } from '../lib/favorites';
import {
	FAVORITES_UPDATED_EVENT,
	readFavoritesFromStorage,
	removeFavorite,
	reorderFavorites,
	seedDefaultFavoritesInStorageIfNeeded,
	updateFavoritesInStorage,
} from '../lib/storage';
import type { Facility } from '../lib/types';

function createFavoritesSnapshot(items: ReturnType<typeof readFavoritesFromStorage>): string {
	return items
		.map((item) => item.facilityId)
		.sort()
		.join(',');
}

function getFavoritesFromStorageSnapshot(
	lastSnapshot: string,
	allFacilities: Facility[]
): { favorites: FavoriteFacility[]; snapshot: string } {
	const currentStorageItems = readFavoritesFromStorage();
	const currentSnapshot = createFavoritesSnapshot(currentStorageItems);

	if (currentSnapshot !== lastSnapshot) {
		const updatedFavorites = matchFavoritesWithFacilities(currentStorageItems, allFacilities);
		return { favorites: updatedFavorites, snapshot: currentSnapshot };
	}

	return { favorites: [], snapshot: lastSnapshot };
}

export function useFavoritesStorage(allFacilities: Facility[]) {
	const [favorites, setFavorites] = useState<FavoriteFacility[]>([]);
	const lastStorageRef = useRef<string>('');

	const checkStorageChanges = useCallback(() => {
		const { favorites: updatedFavorites, snapshot: newSnapshot } = getFavoritesFromStorageSnapshot(
			lastStorageRef.current,
			allFacilities
		);

		if (newSnapshot !== lastStorageRef.current) {
			lastStorageRef.current = newSnapshot;
			if (updatedFavorites.length === 0 && newSnapshot !== '') {
				const currentStorageItems = readFavoritesFromStorage();
				const recalculated = matchFavoritesWithFacilities(currentStorageItems, allFacilities);
				setFavorites(recalculated);
				return;
			}
			setFavorites(updatedFavorites);
		}
	}, [allFacilities]);

	useEffect(() => {
		const seededItems = seedDefaultFavoritesInStorageIfNeeded(allFacilities);
		const initialStorageItems = seededItems ?? readFavoritesFromStorage();
		lastStorageRef.current = createFavoritesSnapshot(initialStorageItems);

		if (initialStorageItems.length > 0) {
			const loadedFavorites = matchFavoritesWithFacilities(initialStorageItems, allFacilities);
			setFavorites(loadedFavorites);
		} else {
			setFavorites([]);
		}

		const handleStorageEvent = (e: StorageEvent) => {
			if (e.key === 'csh_favorites') {
				checkStorageChanges();
			}
		};

		const handleFavoritesUpdated = () => {
			checkStorageChanges();
		};

		window.addEventListener('storage', handleStorageEvent);
		window.addEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);
		const interval = window.setInterval(checkStorageChanges, 500);

		return () => {
			window.clearInterval(interval);
			window.removeEventListener('storage', handleStorageEvent);
			window.removeEventListener(FAVORITES_UPDATED_EVENT, handleFavoritesUpdated);
		};
	}, [allFacilities, checkStorageChanges]);

	const syncFavoritesFromStorage = useCallback(
		(updatedStorageItems: ReturnType<typeof readFavoritesFromStorage>) => {
			updateFavoritesInStorage(updatedStorageItems);
			lastStorageRef.current = createFavoritesSnapshot(updatedStorageItems);
			const updatedFavorites = matchFavoritesWithFacilities(updatedStorageItems, allFacilities);
			setFavorites(updatedFavorites);
			window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
		},
		[allFacilities]
	);

	const handleRemove = useCallback(
		(facilityId: string) => {
			const currentStorageItems = readFavoritesFromStorage();
			const updated = removeFavorite(facilityId, currentStorageItems);
			syncFavoritesFromStorage(updated);
		},
		[syncFavoritesFromStorage]
	);

	const handleMove = useCallback(
		(facilityId: string, direction: 'up' | 'down') => {
			const currentStorageItems = readFavoritesFromStorage();
			const currentIds = currentStorageItems.map((item) => item.facilityId);
			const currentIndex = currentIds.indexOf(facilityId);

			if (currentIndex === -1) {
				return;
			}
			if (direction === 'up' && currentIndex === 0) {
				return;
			}
			if (direction === 'down' && currentIndex === currentIds.length - 1) {
				return;
			}

			const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
			const nextIds = [...currentIds];
			[nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

			const updated = reorderFavorites(nextIds, currentStorageItems);
			syncFavoritesFromStorage(updated);
		},
		[syncFavoritesFromStorage]
	);

	return {
		favorites,
		handleRemove,
		handleMove,
	};
}
