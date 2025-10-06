// Simple k-means implementation

export interface ClusterResult {
  clusterId: number;
  nodes: string[];
  center: { x: number; y: number };
  label: string;
  color: string;
}

export class GraphClustering {
  private static readonly COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  /**
   * K-means clustering based on node connections and properties
   */
  static clusterByConnections(nodes: any[], k: number = 5): ClusterResult[] {
    if (nodes.length < k) {
      k = Math.max(1, nodes.length);
    }

    // Extract features for clustering
    const features = nodes.map(n => [
      n.connections || 0,
      n.tags?.length || 0,
      n.linkedNotes?.length || 0,
      n.x || 0,
      n.y || 0
    ]);

    try {
      const result = this.simpleKMeans(features, k);
      const clusters: Map<number, any[]> = new Map();

      result.clusters.forEach((clusterId: number, idx: number) => {
        if (!clusters.has(clusterId)) {
          clusters.set(clusterId, []);
        }
        clusters.get(clusterId)!.push(nodes[idx]);
      });

      return Array.from(clusters.entries()).map(([id, nodeList]) => ({
        clusterId: id,
        nodes: nodeList.map(n => n.id),
        center: this.calculateCenter(nodeList),
        label: this.generateClusterLabel(nodeList),
        color: this.COLORS[id % this.COLORS.length]
      }));
    } catch (error) {
      console.error('Clustering error:', error);
      // Fallback: single cluster
      return [{
        clusterId: 0,
        nodes: nodes.map(n => n.id),
        center: this.calculateCenter(nodes),
        label: 'All Nodes',
        color: this.COLORS[0]
      }];
    }
  }

  /**
   * Community detection using Louvain-like algorithm
   */
  static detectCommunities(nodes: any[], edges: any[]): Map<string, number> {
    const communities = new Map<string, number>();
    const graph = this.buildAdjacencyList(nodes, edges);

    let communityId = 0;
    const visited = new Set<string>();

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const community = this.findConnectedByTags(node, nodes, graph, visited);
        community.forEach(nId => communities.set(nId, communityId));
        communityId++;
      }
    });

    return communities;
  }

  private static findConnectedByTags(
    startNode: any,
    allNodes: any[],
    graph: Map<string, any[]>,
    visited: Set<string>
  ): string[] {
    const community: string[] = [];
    const queue = [startNode];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;

      visited.add(node.id);
      community.push(node.id);

      // Find nodes with shared tags or direct connections
      const neighbors = graph.get(node.id) || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor.id)) {
          const sharedTags = node.tags?.filter((t: string) => neighbor.tags?.includes(t)) || [];
          if (sharedTags.length > 0 || this.areDirectlyConnected(node, neighbor)) {
            queue.push(neighbor);
          }
        }
      });
    }

    return community;
  }

  private static areDirectlyConnected(node1: any, node2: any): boolean {
    return node1.linkedNotes?.includes(node2.id) || node2.linkedNotes?.includes(node1.id);
  }

  private static buildAdjacencyList(nodes: any[], edges: any[]): Map<string, any[]> {
    const graph = new Map<string, any[]>();
    
    // Initialize
    nodes.forEach(n => graph.set(n.id, []));

    // Build adjacency list
    edges.forEach(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
      const targetId = typeof e.target === 'string' ? e.target : e.target.id;
      
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);

      if (sourceNode && targetNode) {
        graph.get(sourceId)?.push(targetNode);
        graph.get(targetId)?.push(sourceNode);
      }
    });

    return graph;
  }

  private static calculateCenter(nodes: any[]): { x: number; y: number } {
    if (nodes.length === 0) return { x: 0, y: 0 };

    const sum = nodes.reduce(
      (acc, n) => ({
        x: acc.x + (n.x || 0),
        y: acc.y + (n.y || 0)
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / nodes.length,
      y: sum.y / nodes.length
    };
  }

  /**
   * Simple k-means clustering implementation
   */
  private static simpleKMeans(data: number[][], k: number, maxIterations: number = 10): { clusters: number[] } {
    if (data.length === 0) return { clusters: [] };
    
    const n = data.length;
    const dim = data[0].length;
    
    // Initialize centroids randomly
    const centroids: number[][] = [];
    const indices = new Set<number>();
    while (centroids.length < k && centroids.length < n) {
      const idx = Math.floor(Math.random() * n);
      if (!indices.has(idx)) {
        centroids.push([...data[idx]]);
        indices.add(idx);
      }
    }
    
    let clusters = new Array(n).fill(0);
    
    // Iterate
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        
        for (let j = 0; j < centroids.length; j++) {
          const dist = this.euclideanDistance(data[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }
        
        clusters[i] = bestCluster;
      }
      
      // Update centroids
      const newCentroids = Array.from({ length: k }, () => new Array(dim).fill(0));
      const counts = new Array(k).fill(0);
      
      for (let i = 0; i < n; i++) {
        const cluster = clusters[i];
        counts[cluster]++;
        for (let d = 0; d < dim; d++) {
          newCentroids[cluster][d] += data[i][d];
        }
      }
      
      for (let j = 0; j < k; j++) {
        if (counts[j] > 0) {
          for (let d = 0; d < dim; d++) {
            centroids[j][d] = newCentroids[j][d] / counts[j];
          }
        }
      }
    }
    
    return { clusters };
  }

  private static euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private static generateClusterLabel(nodes: any[]): string {
    if (nodes.length === 0) return 'Empty';

    // Count tag frequencies
    const tagCounts = new Map<string, number>();
    nodes.forEach(n => {
      n.tags?.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Find most common tag
    const topTag = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (topTag && topTag[1] > 1) {
      return `#${topTag[0]}`;
    }

    // Fallback to node count
    return `${nodes.length} nodes`;
  }
}
