const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/bfhl", (req, res) => {
    try {
        const { data } = req.body;

        if (!Array.isArray(data)) {
            return res.status(400).json({
                error: "data must be an array"
            });
        }

        const response = {
            user_id: "BhumiSachdeva_25082004",
            email_id: "bhumi0145.be23@chitkara.edu.in",
            college_roll_number: "2310990145",
            hierarchies: [],
            invalid_entries: [],
            duplicate_edges: [],
            summary: {
                total_trees: 0,
                total_cycles: 0,
                largest_tree_root: ""
            }
        };

        const edgeRegex = /^[A-Z]->[A-Z]$/;

        const validEdges = [];
        const seenEdges = new Set();
        const duplicateSet = new Set();

        // Validation + duplicate detection
        for (const item of data) {
            if (typeof item !== "string") {
                response.invalid_entries.push(item);
                continue;
            }

            const edge = item.trim();

            if (
                !edgeRegex.test(edge) ||
                edge[0] === edge[3]
            ) {
                response.invalid_entries.push(item);
                continue;
            }

            if (seenEdges.has(edge)) {
                duplicateSet.add(edge);
            } else {
                seenEdges.add(edge);
                validEdges.push(edge);
            }
        }

        response.duplicate_edges = [...duplicateSet];

        // Build graph with diamond rule
        const children = {};
        const parentOf = {};
        const nodes = new Set();

        for (const edge of validEdges) {
            const [parent, child] = edge.split("->");

            nodes.add(parent);
            nodes.add(child);

            if (!children[parent]) {
                children[parent] = [];
            }

            // First parent wins
            if (!parentOf[child]) {
                parentOf[child] = parent;
                children[parent].push(child);
            }
        }

        const allNodes = [...nodes];

        // Undirected graph for component detection
        const undirected = {};

        for (const node of allNodes) {
            undirected[node] = [];
        }

        for (const parent in children) {
            for (const child of children[parent]) {
                undirected[parent].push(child);
                undirected[child].push(parent);
            }
        }

        const componentVisited = new Set();

        function getComponent(start) {
            const stack = [start];
            const component = [];

            componentVisited.add(start);

            while (stack.length) {
                const node = stack.pop();
                component.push(node);

                for (const neighbour of undirected[node]) {
                    if (!componentVisited.has(neighbour)) {
                        componentVisited.add(neighbour);
                        stack.push(neighbour);
                    }
                }
            }

            return component;
        }

        function detectCycle(node, visiting, visited) {
            if (visiting.has(node)) return true;
            if (visited.has(node)) return false;

            visiting.add(node);

            if (children[node]) {
                for (const child of children[node]) {
                    if (
                        detectCycle(
                            child,
                            visiting,
                            visited
                        )
                    ) {
                        return true;
                    }
                }
            }

            visiting.delete(node);
            visited.add(node);

            return false;
        }

        function buildTree(node) {
            const tree = {};
            let maxDepth = 0;

            if (children[node]) {
                for (const child of children[node]) {
                    const result = buildTree(child);

                    tree[child] = result.tree;

                    maxDepth = Math.max(
                        maxDepth,
                        result.depth
                    );
                }
            }

            return {
                tree,
                depth: maxDepth + 1
            };
        }

        let largestDepth = 0;

        for (const node of allNodes) {
            if (componentVisited.has(node)) continue;

            const component = getComponent(node);

            const visiting = new Set();
            const visited = new Set();

            let hasCycle = false;

            for (const n of component) {
                if (
                    !visited.has(n) &&
                    detectCycle(
                        n,
                        visiting,
                        visited
                    )
                ) {
                    hasCycle = true;
                    break;
                }
            }

            let root = component.find(
                n => !parentOf[n]
            );

            if (!root) {
                root = [...component]
                    .sort()[0];
            }

            if (hasCycle) {
                response.hierarchies.push({
                    root,
                    tree: {},
                    has_cycle: true
                });

                response.summary.total_cycles++;
            } else {
                const result = buildTree(root);

                response.hierarchies.push({
                    root,
                    tree: {
                        [root]: result.tree
                    },
                    depth: result.depth
                });

                response.summary.total_trees++;

                if (
                    result.depth > largestDepth
                ) {
                    largestDepth =
                        result.depth;
                    response.summary.largest_tree_root =
                        root;
                } else if (
                    result.depth ===
                        largestDepth &&
                    root <
                        response.summary
                            .largest_tree_root
                ) {
                    response.summary.largest_tree_root =
                        root;
                }
            }
        }

        response.hierarchies.sort((a, b) =>
            a.root.localeCompare(b.root)
        );

        return res.status(200).json(response);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );
});